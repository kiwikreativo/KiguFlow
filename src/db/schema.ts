import { relations, sql } from 'drizzle-orm';
import { boolean, date, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const clientStatus = pgEnum('client_status', ['lead', 'active', 'inactive', 'archived']);
export const projectStatus = pgEnum('project_status', ['draft', 'onboarding', 'planning', 'in_progress', 'waiting_for_client', 'review', 'completed', 'archived']);
export const phaseStatus = pgEnum('phase_status', ['not_started', 'active', 'completed']);
export const taskStatus = pgEnum('task_status', ['todo', 'in_progress', 'blocked', 'waiting_for_client', 'review', 'completed']);
export const taskPriority = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);
export const assigneeType = pgEnum('assignee_type', ['admin', 'client']);
export const briefStatus = pgEnum('brief_status', ['not_started', 'in_progress', 'submitted', 'reviewed']);
export const briefFieldType = pgEnum('brief_field_type', ['short_text', 'long_text', 'email', 'url', 'select', 'checkbox', 'file']);
export const invoiceStatus = pgEnum('invoice_status', ['draft', 'pending', 'paid', 'overdue', 'cancelled']);
export const documentStatus = pgEnum('document_status', ['pending', 'signed', 'completed']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  businessName: text('business_name').notNull().default('KiguDev'),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  ...timestamps,
}, (t) => [uniqueIndex('users_email_idx').on(t.email)]);

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex('sessions_token_hash_idx').on(t.tokenHash), index('sessions_user_idx').on(t.userId)]);

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  companyName: text('company_name'), email: text('email').notNull(), phone: text('phone'), website: text('website'), notes: text('notes'),
  status: clientStatus('status').notNull().default('active'),
  archivedAt: timestamp('archived_at', { withTimezone: true }), ...timestamps,
}, (t) => [index('clients_status_idx').on(t.status), index('clients_name_idx').on(t.name)]);

export const projectTemplates = pgTable('project_templates', {
  id: uuid('id').primaryKey().defaultRandom(), name: text('name').notNull(), description: text('description'), ...timestamps,
});
export const templatePhases = pgTable('template_phases', {
  id: uuid('id').primaryKey().defaultRandom(), templateId: uuid('template_id').notNull().references(() => projectTemplates.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), description: text('description'), sortOrder: integer('sort_order').notNull().default(0), ...timestamps,
}, (t) => [index('template_phases_template_idx').on(t.templateId)]);
export const templateTasks = pgTable('template_tasks', {
  id: uuid('id').primaryKey().defaultRandom(), phaseId: uuid('phase_id').notNull().references(() => templatePhases.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), description: text('description'), assigneeType: assigneeType('assignee_type').notNull().default('admin'),
  priority: taskPriority('priority').notNull().default('medium'), clientVisible: boolean('client_visible').notNull().default(true),
  requiresClientAction: boolean('requires_client_action').notNull().default(false), sortOrder: integer('sort_order').notNull().default(0), ...timestamps,
}, (t) => [index('template_tasks_phase_idx').on(t.phaseId)]);

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(), clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'restrict' }),
  name: text('name').notNull(), description: text('description'), serviceType: text('service_type'), status: projectStatus('status').notNull().default('draft'),
  startDate: date('start_date'), dueDate: date('due_date'), completedAt: timestamp('completed_at', { withTimezone: true }), archivedAt: timestamp('archived_at', { withTimezone: true }), ...timestamps,
}, (t) => [index('projects_client_idx').on(t.clientId), index('projects_status_idx').on(t.status)]);
export const projectPhases = pgTable('project_phases', {
  id: uuid('id').primaryKey().defaultRandom(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), description: text('description'), sortOrder: integer('sort_order').notNull().default(0), status: phaseStatus('status').notNull().default('not_started'), ...timestamps,
}, (t) => [index('project_phases_project_idx').on(t.projectId)]);
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  phaseId: uuid('phase_id').references(() => projectPhases.id, { onDelete: 'set null' }), title: text('title').notNull(), description: text('description'),
  status: taskStatus('status').notNull().default('todo'), priority: taskPriority('priority').notNull().default('medium'), assigneeType: assigneeType('assignee_type').notNull().default('admin'),
  dueDate: date('due_date'), sortOrder: integer('sort_order').notNull().default(0), clientVisible: boolean('client_visible').notNull().default(false),
  requiresClientAction: boolean('requires_client_action').notNull().default(false), completedAt: timestamp('completed_at', { withTimezone: true }), ...timestamps,
}, (t) => [index('tasks_project_idx').on(t.projectId), index('tasks_phase_idx').on(t.phaseId), index('tasks_status_due_idx').on(t.status, t.dueDate)]);

export const briefTemplates = pgTable('brief_templates', { id: uuid('id').primaryKey().defaultRandom(), name: text('name').notNull(), description: text('description'), ...timestamps });
export const briefFields = pgTable('brief_fields', { id: uuid('id').primaryKey().defaultRandom(), templateId: uuid('template_id').notNull().references(() => briefTemplates.id, { onDelete: 'cascade' }), label: text('label').notNull(), type: briefFieldType('type').notNull(), required: boolean('required').notNull().default(false), options: jsonb('options').$type<string[]>(), sortOrder: integer('sort_order').notNull().default(0), ...timestamps });
export const projectBriefs = pgTable('project_briefs', { id: uuid('id').primaryKey().defaultRandom(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }), templateId: uuid('template_id').references(() => briefTemplates.id, { onDelete: 'set null' }), title: text('title').notNull(), status: briefStatus('status').notNull().default('not_started'), fieldsSnapshot: jsonb('fields_snapshot').$type<Array<{id:string;label:string;type:string;required:boolean;options?:string[]}>>().notNull().default(sql`'[]'::jsonb`), submittedAt: timestamp('submitted_at', { withTimezone: true }), ...timestamps }, (t) => [uniqueIndex('project_briefs_project_idx').on(t.projectId)]);
export const briefResponses = pgTable('brief_responses', { id: uuid('id').primaryKey().defaultRandom(), briefId: uuid('brief_id').notNull().references(() => projectBriefs.id, { onDelete: 'cascade' }), fieldId: text('field_id').notNull(), value: jsonb('value').notNull(), ...timestamps }, (t) => [uniqueIndex('brief_response_field_idx').on(t.briefId, t.fieldId)]);

export const files = pgTable('files', { id: uuid('id').primaryKey().defaultRandom(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }), uploadedBy: text('uploaded_by').notNull(), filename: text('filename').notNull(), originalFilename: text('original_filename').notNull(), mimeType: text('mime_type').notNull(), size: integer('size').notNull(), r2Key: text('r2_key').notNull(), category: text('category').notNull().default('General'), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull() }, (t) => [uniqueIndex('files_r2_key_idx').on(t.r2Key), index('files_project_idx').on(t.projectId)]);
export const documents = pgTable('documents', { id: uuid('id').primaryKey().defaultRandom(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }), fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'restrict' }), title: text('title').notNull(), category: text('category').notNull(), status: documentStatus('status').notNull().default('pending'), ...timestamps });
export const invoices = pgTable('invoices', { id: uuid('id').primaryKey().defaultRandom(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }), invoiceNumber: text('invoice_number').notNull(), description: text('description').notNull(), amountMinor: integer('amount_minor').notNull(), currency: text('currency', { enum: ['CRC', 'USD'] }).notNull(), status: invoiceStatus('status').notNull().default('draft'), issueDate: date('issue_date').notNull(), dueDate: date('due_date'), pdfFileId: uuid('pdf_file_id').references(() => files.id, { onDelete: 'set null' }), ...timestamps }, (t) => [uniqueIndex('invoice_project_number_idx').on(t.projectId, t.invoiceNumber)]);
export const portalTokens = pgTable('portal_tokens', { id: uuid('id').primaryKey().defaultRandom(), projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }), tokenHash: text('token_hash').notNull(), expiresAt: timestamp('expires_at', { withTimezone: true }), revokedAt: timestamp('revoked_at', { withTimezone: true }), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull() }, (t) => [uniqueIndex('portal_token_hash_idx').on(t.tokenHash), index('portal_token_project_idx').on(t.projectId)]);
export const activityLogs = pgTable('activity_logs', { id: uuid('id').primaryKey().defaultRandom(), projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }), clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }), actorType: text('actor_type', { enum: ['admin', 'client', 'system'] }).notNull(), eventType: text('event_type').notNull(), summary: text('summary').notNull(), clientVisible: boolean('client_visible').notNull().default(false), metadata: jsonb('metadata').$type<Record<string, unknown>>(), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull() }, (t) => [index('activity_project_idx').on(t.projectId, t.createdAt)]);

export const clientRelations = relations(clients, ({ many }) => ({ projects: many(projects) }));
export const projectRelations = relations(projects, ({ one, many }) => ({ client: one(clients, { fields: [projects.clientId], references: [clients.id] }), phases: many(projectPhases), tasks: many(tasks) }));
