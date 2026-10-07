import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { and, eq, gt } from 'drizzle-orm';
import { sessions, users } from '@/db/schema';
import { createDatabase, type Database } from './db';
import { fail } from './http';
import { sha256 } from './security';

export type Variables = { db: Database; admin: { id: string; name: string; email: string } };
export const ADMIN_INACTIVITY_MS = 10 * 60 * 1000;

export const database = createMiddleware<{ Bindings: RuntimeEnv; Variables: Variables }>(async (c, next) => {
  c.set('db', createDatabase(c.env.DATABASE_URL));
  await next();
});

export const trustedOrigin = createMiddleware<{ Bindings: RuntimeEnv }>(async (c, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    const origin = c.req.header('Origin');
    const allowed = c.env.ALLOWED_ORIGINS.split(',').map((item) => item.trim());
    if (origin && !allowed.includes(origin)) return fail(c, 403, 'ORIGIN_NOT_ALLOWED', 'Request origin is not allowed.');
  }
  await next();
});

export const requireAdmin = createMiddleware<{ Bindings: RuntimeEnv; Variables: Variables }>(async (c, next) => {
  const token = getCookie(c, 'kiguflow_session');
  if (!token) return fail(c, 401, 'AUTH_REQUIRED', 'Authentication is required.');
  const hash = await sha256(token);
  const rows = await c.get('db').select({ sessionId: sessions.id, lastActivityAt: sessions.lastActivityAt, id: users.id, name: users.name, email: users.email }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(eq(sessions.tokenHash, hash), gt(sessions.expiresAt, new Date()))).limit(1);
  const row = rows[0];
  if (!row) return fail(c, 401, 'SESSION_INVALID', 'Your session is invalid or expired.');
  if (Date.now() - row.lastActivityAt.getTime() >= ADMIN_INACTIVITY_MS) {
    await c.get('db').delete(sessions).where(eq(sessions.id, row.sessionId));
    return fail(c, 401, 'SESSION_INACTIVE', 'Your session expired after 10 minutes of inactivity. Please sign in again.');
  }
  await c.get('db').update(sessions).set({ lastActivityAt: new Date() }).where(eq(sessions.id, row.sessionId));
  c.set('admin', { id: row.id, name: row.name, email: row.email });
  await next();
});
