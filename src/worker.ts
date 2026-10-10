import astro from '@astrojs/cloudflare/entrypoints/server';
import { runScheduledNotifications } from './server/notifications';
import { createDatabase } from './server/db';
import { markScanFailed, processUploadScan, type UploadScanMessage } from './server/uploads';
import { secureResponse } from './server/response-security';

export default {
  async fetch(request, env, ctx) {
    return secureResponse(await astro.fetch(request, env, ctx), env.ENVIRONMENT);
  },
  async queue(batch, env) {
    const db = createDatabase(env.DATABASE_URL);
    for (const message of batch.messages as Message<UploadScanMessage>[]) {
      try {
        await processUploadScan(env, db, message.body.fileId);
        message.ack();
      } catch (error) {
        if (message.attempts >= 3) {
          await markScanFailed(db, message.body.fileId);
          message.ack();
        } else message.retry();
      }
    }
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduledNotifications(env, new Date(controller.scheduledTime)));
  },
} satisfies ExportedHandler<RuntimeEnv>;
