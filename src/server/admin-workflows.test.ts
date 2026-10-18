import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { invoiceSchema, invoiceStatusUpdateSchema, taskListQuerySchema } from '../schemas/api';
import { BUNDLE_SERVICES, SERVICE_BUNDLES, SERVICE_PACKAGES } from '../lib/project-options';

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

  it('does not run global file cleanup when deleting a project without files', () => {
    const source = readFileSync(fileURLToPath(new URL('./app.ts', import.meta.url)), 'utf8');
    const start = source.indexOf("app.delete('/admin/projects/:id'");
    const handler = source.slice(start, source.indexOf("app.", start + 4));
    expect(handler).toContain('if (projectFiles.length) await runFileCleanup');
  });

  it('accepts combined task status and project filters', () => {
    const query = { status: 'review', projectId: 'dff1602f-6482-427e-b10d-b91fe6facea3' };
    expect(taskListQuerySchema.parse(query)).toEqual(query);
    expect(taskListQuerySchema.safeParse({ ...query, projectId: 'not-a-project' }).success).toBe(false);
  });

  it('uses a ten-minute inactivity window', () => {
    const source = readFileSync(fileURLToPath(new URL('./middleware.ts', import.meta.url)), 'utf8');
    expect(source).toContain('10 * 60 * 1000');
    expect(source).toContain("'SESSION_INACTIVE'");
  });

  it('keeps Geographic SEO standalone and models all four bundles by component service', () => {
    expect(SERVICE_PACKAGES).toContain('Geographic SEO');
    expect(SERVICE_PACKAGES).toContain('Local SEO');
    expect(SERVICE_BUNDLES).toHaveLength(4);
    expect(BUNDLE_SERVICES['Local SEO + Geographic SEO']).toEqual(['Local SEO','Geographic SEO']);
  });

  it('does not expose a client portal brief endpoint or payload query', () => {
    const source = readFileSync(fileURLToPath(new URL('./app.ts', import.meta.url)), 'utf8');
    expect(source).not.toContain("app.put('/portal/:token/brief'");
    const portalHandler=source.slice(source.indexOf("app.get('/portal/:token'"),source.indexOf("app.post('/portal/:token/tasks"));
    expect(portalHandler).not.toContain('briefResponses');
    expect(portalHandler).not.toContain('projectBriefs');
    expect(portalHandler).toContain('db.select({ id: projectPhases.id, name: projectPhases.name, status: projectPhases.status })');
    expect(portalHandler).not.toContain('projectPhases.description');
  });

  it('requires an approved Origin for every mutation', () => {
    const source = readFileSync(fileURLToPath(new URL('./middleware.ts', import.meta.url)), 'utf8');
    expect(source).toContain('if (!origin || !allowed.includes(origin))');
  });

  it('keeps legacy brief seed definitions and adds Geographic SEO without destructive writes', () => {
    const seed = readFileSync(fileURLToPath(new URL('../../scripts/seed.ts', import.meta.url)), 'utf8');
    for(const name of ['Website Development Brief','Website Redesign Brief','Local SEO Brief']) expect(seed).toContain(name);
    expect(seed).toContain('Geographic SEO Brief');
    expect(seed).not.toMatch(/delete\(briefTemplates\)|delete\(briefFields\)/);
  });
});
