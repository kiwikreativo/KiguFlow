import { hashPassword, verifyPassword } from './security';

export default {
  async fetch() {
    const stored = await hashPassword('worker-runtime-password', 'worker-runtime-salt');
    return Response.json({
      correct: await verifyPassword('worker-runtime-password', stored),
      incorrect: await verifyPassword('wrong-password', stored),
    });
  },
} satisfies ExportedHandler;
