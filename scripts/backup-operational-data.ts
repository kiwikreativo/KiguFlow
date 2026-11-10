import 'dotenv/config';
import { gzipSync } from 'node:zlib'; import { mkdtemp, rm } from 'node:fs/promises'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { GenerateDataKeyCommand, KMSClient } from '@aws-sdk/client-kms'; import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'; import { neon } from '@neondatabase/serverless'; import { encryptBackup } from './backup-crypto';
const required = ['DATABASE_URL', 'AWS_REGION', 'AWS_KMS_KEY_ID', 'BACKUP_R2_BUCKET', 'BACKUP_R2_ENDPOINT', 'BACKUP_R2_ACCESS_KEY_ID', 'BACKUP_R2_SECRET_ACCESS_KEY'] as const;
for (const name of required) if (!process.env[name]) throw new Error(`${name} is required`);
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'kiguflow-backup-'));
try {
  const sql = neon(process.env.DATABASE_URL!); const tables = ['users', 'clients', 'project_templates', 'template_phases', 'template_tasks', 'projects', 'project_phases', 'tasks', 'notification_deliveries', 'brief_templates', 'brief_fields', 'project_briefs', 'brief_responses', 'files', 'documents', 'invoices', 'activity_logs'] as const;
  const backup: Record<string, unknown[]> = {}; for (const table of tables) backup[table] = await sql.query(`SELECT * FROM "${table}" ORDER BY 1`); backup.__drizzle_migrations = await sql.query('SELECT * FROM "drizzle"."__drizzle_migrations" ORDER BY 1');
  const kms = new KMSClient({ region: process.env.AWS_REGION }); const dataKey = await kms.send(new GenerateDataKeyCommand({ KeyId: process.env.AWS_KMS_KEY_ID, KeySpec: 'AES_256' })); if (!dataKey.Plaintext || !dataKey.CiphertextBlob) throw new Error('KMS did not return a data key.');
  const encrypted = encryptBackup(gzipSync(Buffer.from(JSON.stringify({ createdAt: new Date().toISOString(), tables: backup }))), Buffer.from(dataKey.Plaintext)); const prefix = `daily/${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const manifest = { version: 1, createdAt: new Date().toISOString(), algorithm: 'AES-256-GCM', compressed: 'gzip', digest: encrypted.digest, iv: encrypted.iv, tag: encrypted.tag, encryptedDataKey: Buffer.from(dataKey.CiphertextBlob).toString('base64'), tableCounts: Object.fromEntries(Object.entries(backup).map(([name, rows]) => [name, rows.length])) };
  const r2 = new S3Client({ region: 'auto', endpoint: process.env.BACKUP_R2_ENDPOINT, credentials: { accessKeyId: process.env.BACKUP_R2_ACCESS_KEY_ID!, secretAccessKey: process.env.BACKUP_R2_SECRET_ACCESS_KEY! } });
  await Promise.all([r2.send(new PutObjectCommand({ Bucket: process.env.BACKUP_R2_BUCKET, Key: `${prefix}/backup.bin`, Body: encrypted.ciphertext, ContentType: 'application/octet-stream' })), r2.send(new PutObjectCommand({ Bucket: process.env.BACKUP_R2_BUCKET, Key: `${prefix}/manifest.json`, Body: JSON.stringify(manifest), ContentType: 'application/json' }))]); console.log(JSON.stringify({ prefix, tableCounts: manifest.tableCounts }));
} finally { await rm(temporaryDirectory, { recursive: true, force: true }); }
