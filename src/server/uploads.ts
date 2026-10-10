import { eq } from 'drizzle-orm';
import { files } from '@/db/schema';
import type { Database } from './db';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const types = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf', txt: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const;

export type UploadScanMessage = { fileId: string };

function signatureMatches(bytes: Uint8Array, mimeType: string) {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (mimeType === 'image/webp') return bytes.length >= 12 && text.slice(0, 4) === 'RIFF' && text.slice(8, 12) === 'WEBP';
  if (mimeType === 'application/pdf') return text.startsWith('%PDF-');
  if (mimeType === 'text/plain') return !bytes.includes(0) && new TextDecoder('utf-8', { fatal: true }).decode(bytes) !== undefined;
  // A DOCX is a ZIP package with both the OpenXML content types manifest and a Word document part.
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && text.includes('[Content_Types].xml') && text.includes('word/');
}

export async function validateUpload(upload: File) {
  if (upload.size > MAX_UPLOAD_BYTES) throw new UploadValidationError(413, 'FILE_TOO_LARGE', 'Files must be 10 MB or smaller.');
  const extension = upload.name.includes('.') ? upload.name.split('.').pop()!.toLowerCase() : '';
  const expected = types[extension as keyof typeof types];
  if (!expected || upload.type !== expected) throw new UploadValidationError(415, 'INVALID_FILE_TYPE', 'The file extension and declared type must match an allowed format.');
  const bytes = new Uint8Array(await upload.arrayBuffer());
  if (!signatureMatches(bytes, expected)) throw new UploadValidationError(415, 'INVALID_FILE_SIGNATURE', 'The file contents do not match the selected file type.');
  return { extension, mimeType: expected };
}

export class UploadValidationError extends Error {
  constructor(readonly status: 413 | 415, readonly code: string, message: string) { super(message); }
}

export async function quarantineUpload(env: RuntimeEnv, db: Database, input: { projectId: string; uploadedBy: 'admin' | 'client'; upload: File; category: string; clientVisible: boolean }) {
  const { extension, mimeType } = await validateUpload(input.upload);
  const key = `quarantine/${crypto.randomUUID()}.${extension}`;
  await env.FILES.put(key, input.upload.stream(), { httpMetadata: { contentType: mimeType } });
  try {
    const [record] = await db.insert(files).values({ projectId: input.projectId, uploadedBy: input.uploadedBy, filename: input.upload.name.slice(0, 240), originalFilename: input.upload.name.slice(0, 240), mimeType, size: input.upload.size, r2Key: key, category: input.category.slice(0, 80), clientVisible: input.clientVisible, scanStatus: 'pending' }).returning();
    await env.UPLOAD_SCANS.send({ fileId: record.id });
    return record;
  } catch (error) {
    await env.FILES.delete(key);
    throw error;
  }
}

export async function processUploadScan(env: RuntimeEnv, db: Database, fileId: string) {
  const record = (await db.select().from(files).where(eq(files.id, fileId)).limit(1))[0];
  if (!record || record.scanStatus !== 'pending') return;
  const object = await env.FILES.get(record.r2Key);
  if (!object) throw new Error('Quarantined upload is unavailable.');
  const response = await fetch(env.SCANNER_URL, { method: 'POST', headers: { Authorization: `Bearer ${env.SCANNER_AUTH_TOKEN}`, 'Content-Type': record.mimeType, 'X-Upload-Filename': encodeURIComponent(record.originalFilename) }, body: object.body });
  if (!response.ok) throw new Error('Scanner service did not return a verdict.');
  const result = await response.json<{ verdict?: string }>();
  if (result.verdict === 'clean') {
    const extension = record.r2Key.split('.').pop() || 'bin';
    const finalKey = `projects/${record.projectId}/${crypto.randomUUID()}.${extension}`;
    await env.FILES.put(finalKey, object.body, { httpMetadata: { contentType: record.mimeType } });
    await db.update(files).set({ r2Key: finalKey, scanStatus: 'clean', scannedAt: new Date(), scanFailureReason: null }).where(eq(files.id, record.id));
    await env.FILES.delete(record.r2Key);
    return;
  }
  if (result.verdict === 'rejected') {
    await db.update(files).set({ scanStatus: 'rejected', scannedAt: new Date(), scanFailureReason: 'MALWARE_DETECTED' }).where(eq(files.id, record.id));
    return;
  }
  throw new Error('Scanner returned an invalid verdict.');
}

export async function markScanFailed(db: Database, fileId: string) {
  await db.update(files).set({ scanStatus: 'failed', scannedAt: new Date(), scanFailureReason: 'SCANNER_UNAVAILABLE' }).where(eq(files.id, fileId));
}
