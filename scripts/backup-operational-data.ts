import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const outputDirectory = process.argv[2];
if (!outputDirectory) throw new Error('Usage: tsx scripts/backup-operational-data.ts <output-directory>');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

const sql = neon(process.env.DATABASE_URL);
const tables = [
  'users', 'sessions', 'clients', 'project_templates', 'template_phases', 'template_tasks',
  'projects', 'project_phases', 'tasks', 'notification_deliveries', 'brief_templates',
  'brief_fields', 'project_briefs', 'brief_responses', 'files', 'documents', 'invoices',
  'portal_tokens', 'activity_logs',
] as const;

await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
const backup: Record<string, unknown[]> = {};
for (const table of tables) backup[table] = await sql.query(`SELECT * FROM "${table}" ORDER BY 1`);
backup.__drizzle_migrations = await sql.query('SELECT * FROM "drizzle"."__drizzle_migrations" ORDER BY 1');

const fileKeys = (backup.files as Array<{ r2_key: string }>).map((file) => file.r2_key);
await writeFile(`${outputDirectory}/database.json`, JSON.stringify({ createdAt: new Date().toISOString(), tables: backup }, null, 2), { mode: 0o600 });
await writeFile(`${outputDirectory}/r2-keys.json`, JSON.stringify(fileKeys, null, 2), { mode: 0o600 });
await writeFile(`${outputDirectory}/manifest.json`, JSON.stringify({ createdAt: new Date().toISOString(), tableCounts: Object.fromEntries(Object.entries(backup).map(([table, rows]) => [table, rows.length])), r2ObjectCount: fileKeys.length }, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ outputDirectory, tableCounts: Object.fromEntries(Object.entries(backup).map(([table, rows]) => [table, rows.length])), r2ObjectCount: fileKeys.length }));
