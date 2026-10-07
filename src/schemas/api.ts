import { z } from 'zod';
import { SERVICE_OR_BUNDLE } from '../lib/project-options';

const optionalDate = z.string().date().nullable().optional();
export const id = z.string().uuid();
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(200) });
export const clientSchema = z.object({ name: z.string().trim().min(2).max(120), companyName: z.string().trim().max(160).nullable().optional(), email: z.string().trim().toLowerCase().email(), phone: z.string().trim().max(50).nullable().optional(), website: z.string().url().nullable().optional(), notes: z.string().trim().max(5000).nullable().optional(), status: z.enum(['lead', 'active', 'inactive', 'archived']).default('active'), preferredLanguage: z.enum(['en', 'es']).default('en') });
export const servicePackage = z.enum(SERVICE_OR_BUNDLE);
export const startingStage = z.enum(['scratch', 'discovery_completed', 'design_approved', 'development_started', 'existing_site']);
export const projectSchema = z.object({ clientId: id, name: z.string().trim().min(2).max(180), description: z.string().max(5000).nullable().optional(), serviceType: servicePackage, startingPoint: z.string().regex(/^(stage:[a-z_]+|template:[0-9a-f-]{36})$/), status: z.enum(['draft', 'onboarding', 'planning', 'in_progress', 'waiting_for_client', 'review', 'completed', 'archived']).default('draft'), startDate: optionalDate, dueDate: optionalDate });
export const phaseSchema = z.object({ name: z.string().trim().min(1).max(120), description: z.string().max(2000).nullable().optional(), status: z.enum(['not_started', 'active', 'completed']).default('not_started'), sortOrder: z.number().int().min(0).optional() });
export const taskSchema = z.object({ title: z.string().trim().min(1).max(240), description: z.string().max(5000).nullable().optional(), phaseId: id.nullable().optional(), status: z.enum(['todo', 'in_progress', 'blocked', 'waiting_for_client', 'review', 'completed']).default('todo'), priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'), assigneeType: z.enum(['admin', 'client']).default('admin'), dueDate: optionalDate, sortOrder: z.number().int().min(0).optional(), clientVisible: z.boolean().default(false), requiresClientAction: z.boolean().default(false) });
export const taskListQuerySchema = z.object({ status: z.enum(['todo', 'in_progress', 'blocked', 'waiting_for_client', 'review', 'completed']).optional(), assignee: z.enum(['admin', 'client']).optional(), projectId: id.optional() });
export const invoiceStatusSchema = z.enum(['draft', 'pending', 'half_paid', 'paid', 'overdue', 'cancelled']);
export const invoiceStatusUpdateSchema = z.object({ status: invoiceStatusSchema }).strict();
export const invoiceSchema = z.object({ invoiceNumber: z.string().trim().min(1).max(60), description: z.string().trim().min(1).max(1000), amountMinor: z.number().int().nonnegative(), currency: z.enum(['CRC', 'USD']), status: invoiceStatusSchema.default('draft'), issueDate: z.string().date(), dueDate: optionalDate, pdfFileId: id.nullable().optional() });
