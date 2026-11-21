type MailEnv = Pick<RuntimeEnv, 'RESEND_API_KEY' | 'RESEND_FROM_EMAIL'>;
type Language = 'en' | 'es';

async function postEmail(env: MailEnv, body: Record<string, unknown>) {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_NOT_CONFIGURED');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

async function sendEmail(env: MailEnv, input: { to: string; subject: string; html: string; text?: string }) {
  await postEmail(env, { from: env.RESEND_FROM_EMAIL || 'onboarding@resend.dev', to: [input.to], subject: input.subject, html: input.html, text: input.text });
}

// Published templates in the Resend dashboard own the sender, subject, reply-to and design.
export async function sendTemplate(env: MailEnv, input: { to: string; template: string; variables: Record<string, string> }) {
  await postEmail(env, { to: [input.to], template: { id: input.template, variables: input.variables } });
}

const TEMPLATES = {
  onboarding: { en: 'client-onboarding', es: 'bienvenido' },
  taskReminder: { en: 'task-reminder-1', es: 'task-reminder-es' },
} as const;
const LOGO_URL = 'https://resend-attachments.s3.amazonaws.com/ZrSyr-3yVyF6BlJK7Qr3nh/7537d715-84ab-4a84-ab67-264bf2c7c7d1';
const firstNameOf = (name: string) => name.trim().split(/\s+/)[0] || name;

// Despite the column name, invoices.amountMinor holds whole units (the admin form and both UIs use it as-is).
export const formatAmount = (amountMinor: number, currency: string, language: Language) =>
  new Intl.NumberFormat(language === 'es' ? 'es-CR' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amountMinor);

export async function sendOnboardingEmail(env: MailEnv, input: { to: string; clientName: string; projectName: string; paymentAmount: string; portalUrl: string; language: Language }) {
  await sendTemplate(env, {
    to: input.to,
    template: TEMPLATES.onboarding[input.language],
    variables: { client_first_name: firstNameOf(input.clientName), project_name: input.projectName, payment_amount: input.paymentAmount, portal_invitation_link: input.portalUrl },
  });
}

export async function sendProblemReportNotification(env: MailEnv, input: { to: string; clientName: string; projectName: string; category: string; subject: string; description: string; createdAt: Date; taskUrl: string }) {
  const details = `${input.clientName}\n${input.projectName}\n${input.category}\n${input.subject}\n${input.description}\n${input.createdAt.toISOString()}\n${input.taskUrl}`;
  await sendEmail(env, { to: input.to, subject: `New client issue — ${input.projectName}`, text: details, html: `<p>A client has submitted a new problem report.</p><dl><dt>Client</dt><dd>${escapeHtml(input.clientName)}</dd><dt>Project</dt><dd>${escapeHtml(input.projectName)}</dd><dt>Category</dt><dd>${escapeHtml(input.category)}</dd><dt>Subject</dt><dd>${escapeHtml(input.subject)}</dd><dt>Description</dt><dd style="white-space:pre-wrap">${escapeHtml(input.description)}</dd><dt>Submitted</dt><dd>${escapeHtml(input.createdAt.toISOString())}</dd></dl><p><a href="${escapeHtml(input.taskUrl)}">Open the related task</a></p>` });
}

export async function sendPortalInvitation(env: MailEnv, input: { to: string; clientName: string; projectName: string; url: string }) {
  await sendEmail(env, { to: input.to, subject: `${input.projectName} — your private project portal`, html: `<p>Hello ${escapeHtml(input.clientName)},</p><p>Your private project portal for <strong>${escapeHtml(input.projectName)}</strong> is ready.</p><p><a href="${escapeHtml(input.url)}">Open your project portal</a></p><p>This link expires in 30 days. Please do not forward it.</p>` });
}

// The template has one task card: show the most urgent task and count the rest.
export async function sendClientTaskNotification(env: MailEnv, input: { to: string; clientName: string; projectName: string; language: Language; tasks: Array<{ title: string; dueDate: string | null; reasons: string[] }>; url: string }) {
  const es = input.language === 'es';
  const [top, ...rest] = [...input.tasks].sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  if (!top) return;
  const due = top.dueDate ? new Intl.DateTimeFormat(es ? 'es-CR' : 'en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${top.dueDate}T00:00:00Z`)) : es ? 'sin fecha' : 'no due date';
  const more = rest.length ? (es ? `+${rest.length} ${rest.length === 1 ? 'tarea más' : 'tareas más'} en tu portal` : `+${rest.length} more ${rest.length === 1 ? 'task' : 'tasks'} in your portal`) : '';
  await sendTemplate(env, {
    to: input.to,
    template: TEMPLATES.taskReminder[input.language],
    variables: { client_first_name: firstNameOf(input.clientName), project_name: input.projectName, task_title: top.title, task_due_date: due, task_status: [...top.reasons, more].filter(Boolean).join(' · '), portal_invitation_link: input.url, logo_url: LOGO_URL },
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
