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
