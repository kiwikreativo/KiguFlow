export { SERVICE_PACKAGES } from '../lib/project-options';
export const STARTING_STAGES = ['scratch', 'discovery_completed', 'design_approved', 'development_started', 'existing_site'] as const;

export function parseStartingPoint(value: string) {
  const [kind, identifier] = value.split(':', 2);
  if (kind === 'stage' && STARTING_STAGES.includes(identifier as typeof STARTING_STAGES[number])) return { kind, identifier } as const;
  if (kind === 'template' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)) return { kind, identifier } as const;
  return null;
}

export function phaseStatusForStage(stage: string, phaseIndex: number) {
  const activeIndex: Record<string, number> = { scratch: 0, existing_site: 1, discovery_completed: 2, design_approved: 3, development_started: 3 };
  const active = activeIndex[stage] ?? 0;
  return phaseIndex < active ? 'completed' as const : phaseIndex === active ? 'active' as const : 'not_started' as const;
}
