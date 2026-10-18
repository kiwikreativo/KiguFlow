import { describe, expect, it } from 'vitest';
import { problemReportSchema } from '../schemas/api';
import { renderOnboardingEmail } from './email';

const base = { to: 'client@example.com', clientName: 'María Solís', projectName: '<Project & Co>', paymentType: 'initial', paymentAmount: '$500', portalUrl: 'https://example.com/portal/token', portalTourUrl: undefined, calendarUrl: undefined, cliqTourUrl: undefined };

describe('feature expansion contracts', () => {
  it('renders localized onboarding emails and escapes dynamic HTML', () => {
    const english = renderOnboardingEmail({ ...base, language: 'en' });
    const spanish = renderOnboardingEmail({ ...base, language: 'es' });
    expect(english.subject).toContain('Payment received');
    expect(spanish.subject).toContain('Pago recibido');
    expect(english.html).toContain('&lt;Project &amp; Co&gt;');
    expect(english.html).not.toContain('<Project & Co>');
    expect(english.html).not.toContain('undefined');
  });

  it('trims reports and rejects invalid categories or empty content', () => {
    const valid = problemReportSchema.parse({ requestKey: 'dff1602f-6482-427e-b10d-b91fe6facea3', category: 'technical', subject: '  Login issue  ', description: '  The login form stops after submission.  ' });
    expect(valid.subject).toBe('Login issue');
    expect(problemReportSchema.safeParse({ ...valid, category: 'billing' }).success).toBe(false);
    expect(problemReportSchema.safeParse({ ...valid, description: '   ' }).success).toBe(false);
  });
});
