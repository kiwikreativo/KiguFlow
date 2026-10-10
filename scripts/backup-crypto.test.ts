import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { decryptBackup, encryptBackup } from './backup-crypto';

describe('encrypted backups', () => {
  it('round-trips encrypted data and rejects altered ciphertext', () => {
    const encrypted = encryptBackup(Buffer.from('fixture data'), randomBytes(32));
    expect(decryptBackup(encrypted.ciphertext, encrypted.key, encrypted.iv, encrypted.tag, encrypted.digest).toString()).toBe('fixture data');
    expect(() => decryptBackup(Buffer.from(`${encrypted.ciphertext}x`), encrypted.key, encrypted.iv, encrypted.tag, encrypted.digest)).toThrow('digest');
  });
});
