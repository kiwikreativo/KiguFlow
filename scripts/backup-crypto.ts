import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export function encryptBackup(plaintext: Buffer, key = randomBytes(32)) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { ciphertext, key, iv: Buffer.from(iv).toString('base64'), tag: Buffer.from(cipher.getAuthTag()).toString('base64'), digest: createHash('sha256').update(ciphertext).digest('hex') };
}
export function decryptBackup(ciphertext: Buffer, key: Buffer, iv: string, tag: string, digest: string) {
  if (createHash('sha256').update(ciphertext).digest('hex') !== digest) throw new Error('Encrypted backup digest does not match.');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64')); decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
