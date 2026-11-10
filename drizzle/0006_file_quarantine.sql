CREATE TYPE "public"."file_scan_status" AS ENUM('pending', 'clean', 'rejected', 'failed');
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "scan_status" "file_scan_status" DEFAULT 'clean' NOT NULL;
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "scanned_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "scan_failure_reason" text;
--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "scan_status" SET DEFAULT 'pending';
--> statement-breakpoint
CREATE INDEX "files_scan_status_idx" ON "files" USING btree ("scan_status");
