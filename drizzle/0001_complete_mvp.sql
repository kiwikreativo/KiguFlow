ALTER TABLE "files" ADD COLUMN "client_visible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "files_project_visibility_idx" ON "files" USING btree ("project_id", "client_visible");--> statement-breakpoint
CREATE INDEX "documents_project_idx" ON "documents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "portal_token_expiry_idx" ON "portal_tokens" USING btree ("project_id", "expires_at", "revoked_at");--> statement-breakpoint
CREATE INDEX "template_phases_order_idx" ON "template_phases" USING btree ("template_id", "sort_order");--> statement-breakpoint
CREATE INDEX "template_tasks_order_idx" ON "template_tasks" USING btree ("phase_id", "sort_order");
