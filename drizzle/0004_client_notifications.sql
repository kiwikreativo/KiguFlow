UPDATE "clients" SET "email" = lower(trim("email"));--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "clients" GROUP BY lower(trim("email")) HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate normalized client emails must be merged before applying this migration.';
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX "clients_email_normalized_idx" ON "clients" USING btree (lower(trim("email")));--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "client_assigned_at" timestamp with time zone;--> statement-breakpoint
UPDATE "tasks" SET "client_assigned_at" = "created_at" WHERE "assignee_type" = 'client';--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_key" text NOT NULL,
  "kind" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "recipient" text NOT NULL,
  "client_id" uuid,
  "project_id" uuid NOT NULL,
  "task_id" uuid NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "last_attempt_at" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_event_key_idx" ON "notification_deliveries" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "notification_deliveries_pending_idx" ON "notification_deliveries" USING btree ("status", "attempt_count");--> statement-breakpoint
CREATE INDEX "notification_deliveries_project_idx" ON "notification_deliveries" USING btree ("project_id");
