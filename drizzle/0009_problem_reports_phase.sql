INSERT INTO "template_phases" ("template_id", "name", "sort_order")
SELECT t."id", 'Problem reports', COALESCE((SELECT MAX(p."sort_order") + 1 FROM "template_phases" p WHERE p."template_id" = t."id"), 0)
FROM "project_templates" t
WHERE NOT EXISTS (SELECT 1 FROM "template_phases" p WHERE p."template_id" = t."id" AND p."name" = 'Problem reports');
--> statement-breakpoint
INSERT INTO "project_phases" ("project_id", "name", "sort_order")
SELECT pr."id", 'Problem reports', COALESCE((SELECT MAX(p."sort_order") + 1 FROM "project_phases" p WHERE p."project_id" = pr."id"), 0)
FROM "projects" pr
WHERE NOT EXISTS (SELECT 1 FROM "project_phases" p WHERE p."project_id" = pr."id" AND p."name" = 'Problem reports');
--> statement-breakpoint
UPDATE "tasks" t SET "phase_id" = p."id"
FROM "project_phases" p
WHERE p."project_id" = t."project_id" AND p."name" = 'Problem reports' AND t."phase_id" IS NULL
  AND t."id" IN (SELECT "task_id" FROM "problem_reports" WHERE "task_id" IS NOT NULL);
