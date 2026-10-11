import astro from '@astrojs/cloudflare/entrypoints/server';
import { runScheduledNotifications } from './server/notifications';
import { createDatabase } from './server/db';
import { runFileCleanup } from './server/file-cleanup';
import { retryProblemReportNotifications } from './server/problem-reports';

export default {
  fetch: astro.fetch,
  async scheduled(controller, env, ctx) {
    const db = createDatabase(env.DATABASE_URL);
    ctx.waitUntil(Promise.all([runScheduledNotifications(env, new Date(controller.scheduledTime)), runFileCleanup(env, db), retryProblemReportNotifications(env, db)]));
  },
} satisfies ExportedHandler<RuntimeEnv>;
