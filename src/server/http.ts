import type { Context } from 'hono';

export const ok = <T>(c: Context, data: T, status: 200 | 201 | 202 = 200) => c.json({ data }, status);
export const fail = (c: Context, status: 400 | 401 | 403 | 404 | 409 | 410 | 413 | 415 | 429 | 500, code: string, message: string, fields?: Record<string, string>) =>
  c.json({ error: { code, message, ...(fields ? { fields } : {}) } }, status);
