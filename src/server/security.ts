const encoder = new TextEncoder();

export function randomToken(bytes = 32) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string, salt = randomToken(16)) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 310_000 }, key, 256);
  const hash = [...new Uint8Array(bits)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `pbkdf2-sha256$310000$${salt}$${hash}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [, , salt] = stored.split('$');
  if (!salt) return false;
  const candidate = await hashPassword(password, salt);
  if (candidate.length !== stored.length) return false;
  let difference = 0;
  for (let i = 0; i < stored.length; i += 1) difference |= stored.charCodeAt(i) ^ candidate.charCodeAt(i);
  return difference === 0;
}
