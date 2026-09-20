import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (process.env.CONFIRM_OPERATIONAL_DATA_CLEANUP !== 'DELETE') {
  throw new Error('Set CONFIRM_OPERATIONAL_DATA_CLEANUP=DELETE to run this destructive cleanup.');
}

const sql = neon(process.env.DATABASE_URL);
await sql.query(`
  DO $cleanup$
  BEGIN
    DELETE FROM documents;
    DELETE FROM activity_logs;
    DELETE FROM projects;
    DELETE FROM clients;
  END
  $cleanup$;
`);

const counts = await sql.query(`
  SELECT table_name, row_count
  FROM (VALUES
    ('users', (SELECT count(*)::int FROM users)),
    ('sessions', (SELECT count(*)::int FROM sessions)),
    ('clients', (SELECT count(*)::int FROM clients)),
    ('project_templates', (SELECT count(*)::int FROM project_templates)),
    ('template_phases', (SELECT count(*)::int FROM template_phases)),
    ('template_tasks', (SELECT count(*)::int FROM template_tasks)),
    ('projects', (SELECT count(*)::int FROM projects)),
    ('project_phases', (SELECT count(*)::int FROM project_phases)),
    ('tasks', (SELECT count(*)::int FROM tasks)),
    ('notification_deliveries', (SELECT count(*)::int FROM notification_deliveries)),
    ('brief_templates', (SELECT count(*)::int FROM brief_templates)),
    ('brief_fields', (SELECT count(*)::int FROM brief_fields)),
    ('project_briefs', (SELECT count(*)::int FROM project_briefs)),
    ('brief_responses', (SELECT count(*)::int FROM brief_responses)),
    ('files', (SELECT count(*)::int FROM files)),
    ('documents', (SELECT count(*)::int FROM documents)),
    ('invoices', (SELECT count(*)::int FROM invoices)),
    ('portal_tokens', (SELECT count(*)::int FROM portal_tokens)),
    ('activity_logs', (SELECT count(*)::int FROM activity_logs))
  ) AS counts(table_name, row_count)
  ORDER BY table_name
`);
console.log(JSON.stringify(counts));
