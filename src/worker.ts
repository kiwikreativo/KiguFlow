import astro from '@astrojs/cloudflare/entrypoints/server';
import { runScheduledNotifications } from './server/notifications';

export default {
  fetch: astro.fetch,
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduledNotifications(env, new Date(controller.scheduledTime)));
  },
} satisfies ExportedHandler<RuntimeEnv>;
