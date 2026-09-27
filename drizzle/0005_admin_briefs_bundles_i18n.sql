CREATE TYPE "public"."preferred_language" AS ENUM('en', 'es');--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "preferred_language" "preferred_language" DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "last_activity_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE TABLE "services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "services_name_idx" ON "services" ("name");--> statement-breakpoint
CREATE TABLE "service_bundles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "service_bundles_name_idx" ON "service_bundles" ("name");--> statement-breakpoint
CREATE TABLE "service_bundle_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "bundle_id" uuid NOT NULL REFERENCES "service_bundles"("id") ON DELETE cascade,
  "service_id" uuid NOT NULL REFERENCES "services"("id") ON DELETE restrict,
  "sort_order" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "service_bundle_item_idx" ON "service_bundle_items" ("bundle_id", "service_id");--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "bundle_id" uuid REFERENCES "service_bundles"("id") ON DELETE set null;--> statement-breakpoint
CREATE TABLE "project_services" (
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "service_id" uuid NOT NULL REFERENCES "services"("id") ON DELETE restrict,
  "sort_order" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "project_service_idx" ON "project_services" ("project_id", "service_id");--> statement-breakpoint
DROP INDEX IF EXISTS "project_briefs_project_idx";--> statement-breakpoint
CREATE INDEX "project_briefs_project_idx" ON "project_briefs" ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_briefs_project_template_idx" ON "project_briefs" ("project_id", "template_id");
