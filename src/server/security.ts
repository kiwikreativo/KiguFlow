import { pbkdf2 } from 'node:crypto';

const encoder = new TextEncoder();
const PASSWORD_ITERATIONS = 310_000;
const PASSWORD_KEY_BYTES = 32;

function derivePassword(password: string, salt: string) {
  return new Promise<Uint8Array>((resolve, reject) => {
    pbkdf2(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_BYTES, 'sha256', (error, key) => {
      if (error) {
        console.error('[security/password] derive PBKDF2 bytes failed', { error: error.name || 'Error' });
        reject(error);
      }
      else resolve(key);
    });
  });
}

export function randomToken(bytes = 32) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string, salt = randomToken(16)) {
  // Workers Web Crypto intentionally rejects PBKDF2 iteration counts above
  // 100,000. node:crypto is native under nodejs_compat and produces the same
  // PBKDF2-SHA256 bytes as the original local seeding implementation.
  const bits = await derivePassword(password, salt);
  const hash = [...bits].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, iterations, salt, derivedKey] = stored.split('$');
  if (
    algorithm !== 'pbkdf2-sha256'
    || iterations !== String(PASSWORD_ITERATIONS)
    || !salt
    || !derivedKey
    || !/^[0-9a-f]{64}$/.test(derivedKey)
  ) return false;
  const candidate = await hashPassword(password, salt);
  if (candidate.length !== stored.length) return false;
  let difference = 0;
  for (let i = 0; i < stored.length; i += 1) difference |= stored.charCodeAt(i) ^ candidate.charCodeAt(i);
  return difference === 0;
}
