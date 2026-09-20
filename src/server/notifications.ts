import { and, eq, inArray, lt, ne, or, sql } from 'drizzle-orm';
import { clients, notificationDeliveries, portalTokens, projects, tasks, users } from '../db/schema';
import type { Database } from './db';
import { sendAdminTaskCompletedNotification, sendClientTaskNotification } from './email';
import { randomToken, sha256 } from './security';

const MAX_ATTEMPTS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
type DeliveryKind = typeof notificationDeliveries.$inferInsert.kind;

function costaRicaDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function scheduledEventsForTask(input: { taskId: string; dueDate: string | null; clientAssignedAt: Date | null }, now = new Date()) {
  const today = costaRicaDate(now);
  const events: Array<{ eventKey: string; kind: 'task_due_soon' | 'task_weekly_reminder' }> = [];
  if (input.dueDate) {
    const untilDue = daysBetween(today, input.dueDate);
    if (untilDue >= 0 && untilDue <= 3) events.push({ eventKey: `task:${input.taskId}:due:${input.dueDate}`, kind: 'task_due_soon' });
  }
  if (input.clientAssignedAt) {
    const assignedDays = daysBetween(costaRicaDate(input.clientAssignedAt), today);
    if (assignedDays >= 7) {
      const cycle = Math.floor(assignedDays / 7);
      events.push({ eventKey: `task:${input.taskId}:weekly:${cycle}`, kind: 'task_weekly_reminder' });
    }
  }
  return events;
}

async function insertDeliveries(db: Database, rows: Array<typeof notificationDeliveries.$inferInsert>) {
  if (!rows.length) return;
  await db.insert(notificationDeliveries).values(rows).onConflictDoNothing({ target: notificationDeliveries.eventKey });
}

export async function queueAssignmentDeliveries(db: Database, taskIds: string[]) {
  if (!taskIds.length) return [];
  const rows = await db.select({ taskId: tasks.id, projectId: tasks.projectId, clientId: projects.clientId, recipient: clients.email }).from(tasks).innerJoin(projects, eq(tasks.projectId, projects.id)).innerJoin(clients, eq(projects.clientId, clients.id)).where(and(inArray(tasks.id, taskIds), eq(tasks.assigneeType, 'client'), eq(tasks.clientVisible, true), ne(tasks.status, 'completed'), ne(projects.status, 'archived')));
  const deliveries = rows.map((row) => ({ eventKey: `task:${row.taskId}:assigned`, kind: 'task_assigned' as const, recipient: row.recipient, clientId: row.clientId, projectId: row.projectId, taskId: row.taskId }));
  await insertDeliveries(db, deliveries);
  return deliveries.map((item) => item.eventKey);
}

export async function queueClientCompletionDelivery(db: Database, taskId: string) {
  const row = (await db.select({ taskId: tasks.id, projectId: tasks.projectId, clientId: projects.clientId, recipient: users.email }).from(tasks).innerJoin(projects, eq(tasks.projectId, projects.id)).innerJoin(users, sql`true`).where(eq(tasks.id, taskId)).limit(1))[0];
  if (!row) return [];
  const delivery = { eventKey: `task:${taskId}:client-completed`, kind: 'client_task_completed' as const, recipient: row.recipient, clientId: row.clientId, projectId: row.projectId, taskId: row.taskId };
  await insertDeliveries(db, [delivery]);
  return [delivery.eventKey];
}

export async function queueScheduledNotifications(db: Database, now = new Date()) {
  const rows = await db.select({ taskId: tasks.id, projectId: tasks.projectId, clientId: projects.clientId, recipient: clients.email, dueDate: tasks.dueDate, clientAssignedAt: tasks.clientAssignedAt }).from(tasks).innerJoin(projects, eq(tasks.projectId, projects.id)).innerJoin(clients, eq(projects.clientId, clients.id)).where(and(eq(tasks.assigneeType, 'client'), eq(tasks.clientVisible, true), ne(tasks.status, 'completed'), ne(projects.status, 'archived')));
  const deliveries: Array<typeof notificationDeliveries.$inferInsert> = [];
  for (const row of rows) {
    for (const event of scheduledEventsForTask(row, now)) deliveries.push({ ...event, recipient: row.recipient, clientId: row.clientId, projectId: row.projectId, taskId: row.taskId });
  }
  await insertDeliveries(db, deliveries);
  return deliveries.length;
}

function reasonFor(kind: DeliveryKind) {
  if (kind === 'task_assigned') return 'New task assigned';
  if (kind === 'task_due_soon') return 'Due within three days';
  if (kind === 'task_weekly_reminder') return 'Weekly reminder';
  return 'Completed by client';
}

export async function deliverNotifications(env: RuntimeEnv, db: Database, eventKeys?: string[], publicOrigin = env.APP_URL) {
  const appUrl = publicOrigin.replace(/\/$/, '');
  const filters = [or(eq(notificationDeliveries.status, 'pending'), eq(notificationDeliveries.status, 'failed'))!, lt(notificationDeliveries.attemptCount, MAX_ATTEMPTS)];
  if (eventKeys?.length) filters.push(inArray(notificationDeliveries.eventKey, eventKeys));
  const rows = await db.select({ id: notificationDeliveries.id, kind: notificationDeliveries.kind, recipient: notificationDeliveries.recipient, projectId: notificationDeliveries.projectId, taskId: notificationDeliveries.taskId, taskTitle: tasks.title, dueDate: tasks.dueDate, projectName: projects.name, clientName: clients.name }).from(notificationDeliveries).innerJoin(tasks, eq(notificationDeliveries.taskId, tasks.id)).innerJoin(projects, eq(notificationDeliveries.projectId, projects.id)).innerJoin(clients, eq(projects.clientId, clients.id)).where(and(...filters)).limit(100);
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const audience = row.kind === 'client_task_completed' ? 'admin' : 'client';
    const key = `${audience}:${row.recipient}:${row.projectId}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  let sent = 0;
  let failed = 0;
  for (const group of groups.values()) {
    const ids = group.map((item) => item.id);
    let createdTokenId: string | null = null;
    try {
      if (group[0].kind === 'client_task_completed') {
        await sendAdminTaskCompletedNotification(env, { to: group[0].recipient, clientName: group[0].clientName, projectName: group[0].projectName, tasks: group.map((item) => ({ title: item.taskTitle })), url: `${appUrl}/projects/${group[0].projectId}` });
      } else {
        const raw = randomToken();
        const [token] = await db.insert(portalTokens).values({ projectId: group[0].projectId, tokenHash: await sha256(raw), expiresAt: new Date(Date.now() + 30 * DAY_MS) }).returning({ id: portalTokens.id });
        createdTokenId = token.id;
        const taskMap = new Map<string, { title: string; dueDate: string | null; reasons: string[] }>();
        for (const item of group) {
          const task = taskMap.get(item.taskId) || { title: item.taskTitle, dueDate: item.dueDate, reasons: [] };
          task.reasons.push(reasonFor(item.kind));
          taskMap.set(item.taskId, task);
        }
        await sendClientTaskNotification(env, { to: group[0].recipient, clientName: group[0].clientName, projectName: group[0].projectName, tasks: [...taskMap.values()], url: `${appUrl}/portal/${raw}` });
      }
      await db.update(notificationDeliveries).set({ status: 'sent', sentAt: new Date(), lastAttemptAt: new Date(), lastError: null, attemptCount: sql`${notificationDeliveries.attemptCount} + 1`, updatedAt: new Date() }).where(inArray(notificationDeliveries.id, ids));
      sent += ids.length;
    } catch (error) {
      if (createdTokenId) await db.delete(portalTokens).where(eq(portalTokens.id, createdTokenId)).catch(() => undefined);
      const message = error instanceof Error ? error.message.slice(0, 500) : 'UNKNOWN_EMAIL_ERROR';
      await db.update(notificationDeliveries).set({ status: 'failed', lastAttemptAt: new Date(), lastError: message, attemptCount: sql`${notificationDeliveries.attemptCount} + 1`, updatedAt: new Date() }).where(inArray(notificationDeliveries.id, ids));
      console.error('Notification delivery failed', { deliveryIds: ids, error: message });
      failed += ids.length;
    }
  }
  return { queued: rows.length, sent, failed };
}

export async function runScheduledNotifications(env: RuntimeEnv, now = new Date()) {
  const { createDatabase } = await import('./db');
  const db = createDatabase(env.DATABASE_URL);
  const created = await queueScheduledNotifications(db, now);
  const delivery = await deliverNotifications(env, db);
  console.log('Scheduled notifications processed', { created, ...delivery });
  return { created, ...delivery };
}
