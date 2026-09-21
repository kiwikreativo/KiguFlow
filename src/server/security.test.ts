import { describe, expect, it } from 'vitest';
import { hashPassword, randomToken, sha256, verifyPassword } from './security';

describe('security primitives', () => {
  it('hashes and verifies passwords without storing plaintext', async () => { const hash = await hashPassword('a-realistic-password'); expect(hash).not.toContain('a-realistic-password'); expect(await verifyPassword('a-realistic-password', hash)).toBe(true); expect(await verifyPassword('wrong-password', hash)).toBe(false); });
  it('preserves the existing PBKDF2-SHA256 hash format byte-for-byte', async () => {
    const existingHash = 'pbkdf2-sha256$310000$fixed-worker-salt$547eead7bf7ceb853d517a88fba1e60a2d921f462a4a162f0fa8a7cd14e3a1d5';
    expect(await hashPassword('worker-compatible-password', 'fixed-worker-salt')).toBe(existingHash);
    expect(await verifyPassword('worker-compatible-password', existingHash)).toBe(true);
  });
  it.each([
    '',
    'not-a-password-hash',
    'pbkdf2-sha256$310000$$00',
    'pbkdf2-sha256$100000$salt$0000000000000000000000000000000000000000000000000000000000000000',
    'unknown$310000$salt$0000000000000000000000000000000000000000000000000000000000000000',
  ])('rejects malformed or incompatible stored hashes without throwing', async (stored) => {
    await expect(verifyPassword('worker-compatible-password', stored)).resolves.toBe(false);
  });
  it('creates unguessable portal tokens and stable hashes', async () => { const a = randomToken(); const b = randomToken(); expect(a).not.toBe(b); expect(a.length).toBeGreaterThan(40); expect(await sha256(a)).toHaveLength(64); });
});
