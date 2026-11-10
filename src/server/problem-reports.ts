import { and, eq, lt, or, sql } from 'drizzle-orm';
import { clients, problemReports, projects, users } from '../db/schema';
import type { Database } from './db';
import { sendProblemReportNotification } from './email';

export async function retryProblemReportNotifications(env: RuntimeEnv, db: Database) {
  const admin = (await db.select({ email: users.email }).from(users).limit(1))[0];
  if (!admin) return { sent: 0, failed: 0 };
  const reports = await db.select({ id: problemReports.id, projectId: problemReports.projectId, clientName: clients.name, projectName: projects.name, category: problemReports.category, subject: problemReports.subject, description: problemReports.description, createdAt: problemReports.createdAt }).from(problemReports).innerJoin(projects, eq(problemReports.projectId, projects.id)).innerJoin(clients, eq(problemReports.clientId, clients.id)).where(and(or(eq(problemReports.notificationStatus, 'pending'), eq(problemReports.notificationStatus, 'failed'))!, lt(problemReports.notificationAttempts, 5))).limit(50);
  let sent = 0;
  let failed = 0;
  for (const report of reports) {
    try {
      await sendProblemReportNotification(env, { to: admin.email, clientName: report.clientName, projectName: report.projectName, category: report.category.replaceAll('_', ' '), subject: report.subject, description: report.description, createdAt: report.createdAt, taskUrl: `${env.APP_URL.replace(/\/$/, '')}/tasks?projectId=${report.projectId}` });
      await db.update(problemReports).set({ notificationStatus: 'sent', notificationAttempts: sql`${problemReports.notificationAttempts} + 1`, notificationError: null, updatedAt: new Date() }).where(eq(problemReports.id, report.id));
      sent += 1;
    } catch (error) {
      await db.update(problemReports).set({ notificationStatus: 'failed', notificationAttempts: sql`${problemReports.notificationAttempts} + 1`, notificationError: error instanceof Error ? error.message.slice(0, 500) : 'EMAIL_FAILED', updatedAt: new Date() }).where(eq(problemReports.id, report.id));
      failed += 1;
    }
  }
  return { sent, failed };
}
