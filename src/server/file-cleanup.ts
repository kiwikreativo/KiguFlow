import { eq, inArray, sql } from 'drizzle-orm';
import { fileCleanupJobs } from '@/db/schema';
import type { Database } from './db';

export async function runFileCleanup(env: Pick<RuntimeEnv, 'FILES'>, db: Database, keys?: string[]) {
  const jobs = keys?.length ? await db.select().from(fileCleanupJobs).where(inArray(fileCleanupJobs.r2Key, keys)) : await db.select().from(fileCleanupJobs).limit(100);
  for (const job of jobs) {
    try {
      await env.FILES.delete(job.r2Key);
      await db.delete(fileCleanupJobs).where(eq(fileCleanupJobs.id, job.id));
    } catch (error) {
      await db.update(fileCleanupJobs).set({ attemptCount: sql`${fileCleanupJobs.attemptCount} + 1`, lastError: error instanceof Error ? error.message.slice(0, 500) : 'R2_DELETE_FAILED', updatedAt: new Date() }).where(eq(fileCleanupJobs.id, job.id));
    }
  }
}
