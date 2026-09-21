const encoder = new TextEncoder();
const PASSWORD_ITERATIONS = 310_000;
const PASSWORD_KEY_BYTES = 32;
const SHA256_WORDS = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const SHA256_INITIAL = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);

function compressSha256(state: Uint32Array, words: Uint32Array) {
  for (let index = 16; index < 64; index += 1) {
    const x = words[index - 15]; const y = words[index - 2];
    const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
    const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
    words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
  }
  let [a, b, c, d, e, f, g, h] = state;
  for (let index = 0; index < 64; index += 1) {
    const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
    const choice = (e & f) ^ (~e & g);
    const t1 = (h + s1 + choice + SHA256_WORDS[index] + words[index]) >>> 0;
    const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
    const majority = (a & b) ^ (a & c) ^ (b & c);
    const t2 = (s0 + majority) >>> 0;
    h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
  }
  state[0] = (state[0] + a) >>> 0; state[1] = (state[1] + b) >>> 0;
  state[2] = (state[2] + c) >>> 0; state[3] = (state[3] + d) >>> 0;
  state[4] = (state[4] + e) >>> 0; state[5] = (state[5] + f) >>> 0;
  state[6] = (state[6] + g) >>> 0; state[7] = (state[7] + h) >>> 0;
}

function sha256Bytes(input: Uint8Array) {
  const bitLength = input.length * 8;
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(input);
  bytes[input.length] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(paddedLength - 4, bitLength, false);
  const state = SHA256_INITIAL.slice();
  const words = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
    compressSha256(state, words);
  }
  const output = new Uint8Array(32); const outputView = new DataView(output.buffer);
  for (let index = 0; index < state.length; index += 1) outputView.setUint32(index * 4, state[index], false);
  return output;
}

function createHmacSha256(key: Uint8Array) {
  const blockKey = new Uint8Array(64);
  blockKey.set(key.length > 64 ? sha256Bytes(key) : key);
  const innerWords = new Uint32Array(64); const outerWords = new Uint32Array(64);
  for (let index = 0; index < 16; index += 1) {
    const offset = index * 4;
    innerWords[index] = ((blockKey[offset] ^ 0x36) << 24) | ((blockKey[offset + 1] ^ 0x36) << 16) | ((blockKey[offset + 2] ^ 0x36) << 8) | (blockKey[offset + 3] ^ 0x36);
    outerWords[index] = ((blockKey[offset] ^ 0x5c) << 24) | ((blockKey[offset + 1] ^ 0x5c) << 16) | ((blockKey[offset + 2] ^ 0x5c) << 8) | (blockKey[offset + 3] ^ 0x5c);
  }
  const innerBase = SHA256_INITIAL.slice(); const outerBase = SHA256_INITIAL.slice();
  compressSha256(innerBase, innerWords); compressSha256(outerBase, outerWords);
  const state = new Uint32Array(8); const words = new Uint32Array(64);
  return (message: Uint8Array, output: Uint8Array) => {
    words.fill(0, 0, 16);
    for (let index = 0; index < message.length; index += 1) words[index >>> 2] |= message[index] << (24 - (index & 3) * 8);
    words[message.length >>> 2] |= 0x80 << (24 - (message.length & 3) * 8);
    words[15] = (64 + message.length) * 8;
    state.set(innerBase); compressSha256(state, words);
    words.fill(0, 0, 16);
    for (let index = 0; index < 8; index += 1) words[index] = state[index];
    words[8] = 0x80000000; words[15] = 96 * 8;
    state.set(outerBase); compressSha256(state, words);
    const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
    for (let index = 0; index < 8; index += 1) view.setUint32(index * 4, state[index], false);
  };
}

async function derivePassword(password: string, salt: string) {
  try {
    const passwordBytes = encoder.encode(password); const saltBytes = encoder.encode(salt);
    const initial = new Uint8Array(saltBytes.length + 4); initial.set(saltBytes); initial[initial.length - 1] = 1;
    const hmac = createHmacSha256(passwordBytes); let iteration = new Uint8Array(32); let next = new Uint8Array(32);
    hmac(initial, iteration); const derived = iteration.slice();
    for (let count = 1; count < PASSWORD_ITERATIONS; count += 1) {
      hmac(iteration, next);
      for (let index = 0; index < PASSWORD_KEY_BYTES; index += 1) derived[index] ^= next[index];
      const previous = iteration; iteration = next; next = previous;
      if (count % 4096 === 0) await Promise.resolve();
    }
    console.info('[security/password] PBKDF2 derivation completed');
    return derived;
  } catch (error) {
    console.error('[security/password] derive PBKDF2 bytes failed', { error: error instanceof Error ? error.name : 'UnknownError' });
    throw error;
  }
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
  // Workerd rejects PBKDF2 iteration counts above 100,000 in both Web Crypto
  // and its node:crypto compatibility path. This implementation preserves the
  // existing 310,000-iteration PBKDF2-SHA256 format without those APIs.
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
  ) {
    console.info('[security/password] stored hash rejected');
    return false;
  }
  console.info('[security/password] stored hash parsed');
  const candidate = await hashPassword(password, salt);
  if (candidate.length !== stored.length) {
    console.info('[security/password] password comparison completed', { matched: false });
    return false;
  }
  let difference = 0;
  for (let i = 0; i < stored.length; i += 1) difference |= stored.charCodeAt(i) ^ candidate.charCodeAt(i);
  const matched = difference === 0;
  console.info('[security/password] password comparison completed', { matched });
  return matched;
}
