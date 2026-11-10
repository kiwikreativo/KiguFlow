ALTER TABLE "invoices" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_project_id_projects_id_fk";--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "problem_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE restrict,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
  "task_id" uuid REFERENCES "tasks"("id") ON DELETE set null,
  "category" text NOT NULL,
  "subject" text NOT NULL,
  "description" text NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "request_key" text NOT NULL,
  "notification_status" text DEFAULT 'pending' NOT NULL,
  "notification_attempts" integer DEFAULT 0 NOT NULL,
  "notification_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "problem_reports_request_key_idx" ON "problem_reports" ("request_key");--> statement-breakpoint
CREATE INDEX "problem_reports_project_idx" ON "problem_reports" ("project_id", "created_at");--> statement-breakpoint
CREATE INDEX "problem_reports_notification_idx" ON "problem_reports" ("notification_status", "notification_attempts");--> statement-breakpoint
CREATE TABLE "onboarding_email_deliveries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE cascade,
  "status" text DEFAULT 'pending' NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "sent_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "onboarding_email_invoice_idx" ON "onboarding_email_deliveries" ("invoice_id");
