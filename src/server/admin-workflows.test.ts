import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { invoiceSchema, invoiceStatusUpdateSchema, taskListQuerySchema } from '../schemas/api';

describe('admin workflow validation', () => {
  it('accepts half-paid invoice updates while retaining legacy statuses', () => {
    expect(invoiceStatusUpdateSchema.parse({ status: 'half_paid' })).toEqual({ status: 'half_paid' });
    expect(invoiceStatusUpdateSchema.parse({ status: 'overdue' })).toEqual({ status: 'overdue' });
    expect(invoiceStatusUpdateSchema.safeParse({ status: 'partially_paid' }).success).toBe(false);
    expect(invoiceStatusUpdateSchema.safeParse({ status: 'paid', description: 'Unexpected' }).success).toBe(false);
    expect(invoiceSchema.shape.status.safeParse('half_paid').success).toBe(true);
  });

  it('registers a single invoice status PATCH handler', () => {
    const source = readFileSync(fileURLToPath(new URL('./app.ts', import.meta.url)), 'utf8');
    expect(source.match(/app\.patch\('\/admin\/invoices\/:id'/g)).toHaveLength(1);
  });

  it('accepts combined task status and project filters', () => {
    const query = { status: 'review', projectId: 'dff1602f-6482-427e-b10d-b91fe6facea3' };
    expect(taskListQuerySchema.parse(query)).toEqual(query);
    expect(taskListQuerySchema.safeParse({ ...query, projectId: 'not-a-project' }).success).toBe(false);
  });
});
