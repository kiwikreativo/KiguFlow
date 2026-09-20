type MailEnv = Pick<RuntimeEnv, 'RESEND_API_KEY' | 'RESEND_FROM_EMAIL'>;

async function sendEmail(env: MailEnv, input: { to: string; subject: string; html: string }) {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_NOT_CONFIGURED');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.RESEND_FROM_EMAIL || 'onboarding@resend.dev', to: [input.to], subject: input.subject, html: input.html }),
  });
  if (!response.ok) {
    const responseText = (await response.text()).slice(0, 500);
    let detail = responseText;
    try {
      const parsed = JSON.parse(responseText) as { message?: unknown };
      if (typeof parsed.message === 'string') detail = parsed.message;
    } catch {
      // Resend can return a plain-text error response.
    }
    throw new Error(`RESEND_FAILED_${response.status}${detail ? `: ${detail}` : ''}`);
  }
}

export async function sendPortalInvitation(env: MailEnv, input: { to: string; clientName: string; projectName: string; url: string }) {
  await sendEmail(env, { to: input.to, subject: `${input.projectName} — your private project portal`, html: `<p>Hello ${escapeHtml(input.clientName)},</p><p>Your private project portal for <strong>${escapeHtml(input.projectName)}</strong> is ready.</p><p><a href="${escapeHtml(input.url)}">Open your project portal</a></p><p>This link expires in 30 days. Please do not forward it.</p>` });
}

export async function sendClientTaskNotification(env: MailEnv, input: { to: string; clientName: string; projectName: string; tasks: Array<{ title: string; dueDate: string | null; reasons: string[] }>; url: string }) {
  const rows = input.tasks.map((task) => `<li><strong>${escapeHtml(task.title)}</strong>${task.dueDate ? ` — due ${escapeHtml(task.dueDate)}` : ''}<br><small>${escapeHtml(task.reasons.join(' · '))}</small></li>`).join('');
  await sendEmail(env, {
    to: input.to,
    subject: `${input.projectName} — tasks need your attention`,
    html: `<p>Hello ${escapeHtml(input.clientName)},</p><p>There are project tasks that need your attention:</p><ul>${rows}</ul><p><a href="${escapeHtml(input.url)}">Open your private project portal</a></p><p>This secure link expires in 30 days. Please do not forward it.</p>`,
  });
}

export async function sendAdminTaskCompletedNotification(env: MailEnv, input: { to: string; clientName: string; projectName: string; tasks: Array<{ title: string }> ; url: string }) {
  const rows = input.tasks.map((task) => `<li>${escapeHtml(task.title)}</li>`).join('');
  await sendEmail(env, {
    to: input.to,
    subject: `${input.clientName} completed a task in ${input.projectName}`,
    html: `<p>${escapeHtml(input.clientName)} completed the following task${input.tasks.length === 1 ? '' : 's'}:</p><ul>${rows}</ul><p><a href="${escapeHtml(input.url)}">Open the project</a></p>`,
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);
}
