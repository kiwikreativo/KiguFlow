type MailEnv = Pick<RuntimeEnv, 'RESEND_API_KEY' | 'RESEND_FROM_EMAIL'>;

export async function sendPortalInvitation(env: MailEnv, input: { to: string; clientName: string; projectName: string; url: string }) {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_NOT_CONFIGURED');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [input.to],
      subject: `${input.projectName} — your private project portal`,
      html: `<p>Hello ${escapeHtml(input.clientName)},</p><p>Your private project portal for <strong>${escapeHtml(input.projectName)}</strong> is ready.</p><p><a href="${escapeHtml(input.url)}">Open your project portal</a></p><p>This link expires in 30 days. Please do not forward it.</p>`,
    }),
  });
  if (!response.ok) throw new Error(`RESEND_FAILED_${response.status}`);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);
}
