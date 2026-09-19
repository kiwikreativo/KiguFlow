import { activityLogs } from '@/db/schema';
import type { Database } from './db';

export async function logActivity(db: Database, input: typeof activityLogs.$inferInsert) {
  await db.insert(activityLogs).values(input);
}
