import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@/db/schema';

export type Database = ReturnType<typeof createDatabase>;
export function createDatabase(url: string) {
  if (!url) throw new Error('DATABASE_URL is not configured');
  return drizzle(neon(url), { schema });
}
