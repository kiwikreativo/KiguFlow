import { describe, expect, it } from 'vitest';
import { parseStartingPoint, phaseStatusForStage, SERVICE_PACKAGES } from './project-creation';
import { SERVICE_BUNDLES } from '../lib/project-options';

describe('project starting points', () => {
  it('exposes standalone services separately from service bundles', () => {
    expect(SERVICE_PACKAGES.length).toBeGreaterThanOrEqual(9);
    expect(SERVICE_PACKAGES).toContain('Local SEO');
    expect(SERVICE_PACKAGES).toContain('Geographic SEO');
    expect(SERVICE_PACKAGES).toContain('Web Development + SEO');
    expect(SERVICE_PACKAGES).toContain('Web Redesign + SEO');
    expect(SERVICE_BUNDLES).toContain('Website Redesign + Local SEO');
    expect(SERVICE_BUNDLES).toContain('Mobile Enhancement + SEO');
  });
  it('accepts supported stages and template UUIDs', () => {
    expect(parseStartingPoint('stage:design_approved')).toEqual({ kind: 'stage', identifier: 'design_approved' });
    expect(parseStartingPoint('template:dff1602f-6482-427e-b10d-b91fe6facea3')?.kind).toBe('template');
    expect(parseStartingPoint('stage:unknown')).toBeNull();
    expect(parseStartingPoint('template:not-an-id')).toBeNull();
  });

  it('maps earlier, current, and future phases', () => {
    expect([0, 1, 2, 3].map((index) => phaseStatusForStage('discovery_completed', index))).toEqual(['completed', 'completed', 'active', 'not_started']);
    expect([0, 1].map((index) => phaseStatusForStage('scratch', index))).toEqual(['active', 'not_started']);
  });
});
