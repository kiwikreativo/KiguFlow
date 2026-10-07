ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "preferred_language" text DEFAULT 'English' NOT NULL;
