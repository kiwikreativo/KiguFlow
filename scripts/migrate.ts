import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
await migrate(drizzle(neon(process.env.DATABASE_URL)), { migrationsFolder: './drizzle' });
console.log('KiguFlow migrations applied.');
