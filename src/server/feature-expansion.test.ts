import { describe, expect, it } from 'vitest';
import { problemReportSchema } from '../schemas/api';
import { formatAmount, sendOnboardingEmail } from './email';

describe('feature expansion contracts', () => {
  it('sends the welcome template in the client language', async () => {
    const ids: string[] = [];
    const variables: Array<Record<string, string>> = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      ids.push(body.template.id);
      variables.push(body.template.variables);
      return new Response('{}');
    }) as typeof fetch;
    try {
      const base = { to: 'client@example.com', clientName: 'María Solís', projectName: 'Project & Co', paymentAmount: formatAmount(200, 'USD', 'en'), portalUrl: 'https://example.com/portal/token' };
      await sendOnboardingEmail({ RESEND_API_KEY: 'k' }, { ...base, language: 'es' });
      await sendOnboardingEmail({ RESEND_API_KEY: 'k' }, { ...base, language: 'en' });
    } finally {
      globalThis.fetch = realFetch;
    }
    expect(ids).toEqual(['bienvenido', 'client-onboarding']);
    expect(variables[1]).toEqual({ client_first_name: 'María', project_name: 'Project & Co', payment_amount: '$200', portal_invitation_link: 'https://example.com/portal/token' });
  });

  it('trims reports and rejects invalid categories or empty content', () => {
    const valid = problemReportSchema.parse({ requestKey: 'dff1602f-6482-427e-b10d-b91fe6facea3', category: 'technical', subject: '  Login issue  ', description: '  The login form stops after submission.  ' });
    expect(valid.subject).toBe('Login issue');
    expect(problemReportSchema.safeParse({ ...valid, category: 'billing' }).success).toBe(false);
    expect(problemReportSchema.safeParse({ ...valid, description: '   ' }).success).toBe(false);
  });
});
