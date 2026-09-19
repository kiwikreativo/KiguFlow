import { describe, expect, it } from 'vitest';
import { hashPassword, randomToken, sha256, verifyPassword } from './security';

describe('security primitives', () => {
  it('hashes and verifies passwords without storing plaintext', async () => { const hash = await hashPassword('a-realistic-password'); expect(hash).not.toContain('a-realistic-password'); expect(await verifyPassword('a-realistic-password', hash)).toBe(true); expect(await verifyPassword('wrong-password', hash)).toBe(false); });
  it('creates unguessable portal tokens and stable hashes', async () => { const a = randomToken(); const b = randomToken(); expect(a).not.toBe(b); expect(a.length).toBeGreaterThan(40); expect(await sha256(a)).toHaveLength(64); });
});
