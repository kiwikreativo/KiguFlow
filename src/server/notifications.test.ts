import { describe, expect, it } from 'vitest';
import { clientSchema } from '../schemas/api';
import { scheduledEventsForTask } from './notifications';

const now = new Date('2026-09-20T18:00:00Z');

describe('notification scheduling', () => {
  it('normalizes client emails before uniqueness checks', () => {
    const client = clientSchema.parse({ name: 'Test Client', email: '  PERSON@Example.COM  ' });
    expect(client.email).toBe('person@example.com');
  });

  it('queues due-soon notices inside the three-day window only', () => {
    const base = { taskId: 'task-1', clientAssignedAt: null };
    expect(scheduledEventsForTask({ ...base, dueDate: '2026-09-24' }, now)).toEqual([]);
    expect(scheduledEventsForTask({ ...base, dueDate: '2026-09-23' }, now)[0]?.kind).toBe('task_due_soon');
    expect(scheduledEventsForTask({ ...base, dueDate: '2026-09-20' }, now)[0]?.kind).toBe('task_due_soon');
    expect(scheduledEventsForTask({ ...base, dueDate: '2026-09-19' }, now)).toEqual([]);
  });

  it('uses stable weekly cycle keys for idempotent reminders', () => {
    const task = { taskId: 'task-1', dueDate: null, clientAssignedAt: new Date('2026-09-06T18:00:00Z') };
    expect(scheduledEventsForTask(task, now)).toContainEqual({ eventKey: 'task:task-1:weekly:2', kind: 'task_weekly_reminder' });
    expect(scheduledEventsForTask(task, new Date('2026-09-26T18:00:00Z'))).toContainEqual({ eventKey: 'task:task-1:weekly:2', kind: 'task_weekly_reminder' });
    expect(scheduledEventsForTask(task, new Date('2026-09-27T18:00:00Z'))).toContainEqual({ eventKey: 'task:task-1:weekly:3', kind: 'task_weekly_reminder' });
  });
});

// Captures what we POST to Resend instead of sending it.
async function captureResend(run: () => Promise<void>) {
  const bodies: Array<Record<string, any>> = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)));
    return new Response('{}');
  }) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = realFetch;
  }
  return bodies;
}

describe('task reminder template', () => {
  it('sends one reminder with the most urgent task and counts the rest', async () => {
    const { sendClientTaskNotification } = await import('./email');
    const bodies = await captureResend(() =>
      sendClientTaskNotification({ RESEND_API_KEY: 'k' }, {
        to: 'client@example.com', clientName: 'María Solís', projectName: 'Sitio', language: 'es', url: 'https://kiguflow.com/portal/x',
        tasks: [
          { title: 'Sin fecha', dueDate: null, reasons: ['Nueva tarea asignada'] },
          { title: 'Revisar diseño', dueDate: '2026-11-24', reasons: ['Vence en tres días'] },
          { title: 'Subir logos', dueDate: '2026-12-01', reasons: ['Recordatorio semanal'] },
        ],
      }),
    );
    expect(bodies).toHaveLength(1);
    expect(bodies[0].from).toBeUndefined();
    expect(bodies[0].template.id).toBe('task-reminder-es');
    expect(bodies[0].template.variables).toMatchObject({ client_first_name: 'María', project_name: 'Sitio', task_title: 'Revisar diseño', task_status: 'Vence en tres días · +2 tareas más en tu portal', portal_invitation_link: 'https://kiguflow.com/portal/x' });
  });
});
