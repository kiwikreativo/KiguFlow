ALTER TABLE "project_templates" ADD COLUMN "service_package" text;--> statement-breakpoint
ALTER TABLE "project_templates" ADD COLUMN "is_package_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "starting_point" text;--> statement-breakpoint
CREATE INDEX "project_templates_package_idx" ON "project_templates" USING btree ("service_package", "is_package_default");
