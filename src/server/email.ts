type MailEnv = Pick<RuntimeEnv, 'RESEND_API_KEY' | 'RESEND_FROM_EMAIL'>;

async function sendEmail(env: MailEnv, input: { to: string; subject: string; html: string; text?: string }) {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_NOT_CONFIGURED');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.RESEND_FROM_EMAIL || 'onboarding@resend.dev', to: [input.to], subject: input.subject, html: input.html, text: input.text }),
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

type OnboardingInput = { to: string; clientName: string; projectName: string; paymentType: string; paymentAmount: string; portalUrl: string; language: 'en' | 'es'; portalTourUrl?: string; calendarUrl?: string; cliqTourUrl?: string };
export function renderOnboardingEmail(input: OnboardingInput) {
  const firstName = input.clientName.trim().split(/\s+/)[0] || input.clientName;
  const es = input.language === 'es';
  const copy = es ? {
    subject: `Pago recibido ✓ — Bienvenido a ${input.projectName}`, greeting: `Hola ${firstName},`, welcome: `¡Qué gusto darte la bienvenida! Me entusiasma comenzar a trabajar en ${input.projectName}. Tu espacio de proyecto ya está listo para mantener todo organizado en un solo lugar.`, paid: '✓ Pago recibido', payment: `Recibimos y registramos tu pago de ${input.paymentType} por ${input.paymentAmount}. Muchas gracias. Con esto iniciamos oficialmente la etapa de incorporación.`, portal: 'Tu espacio de proyecto está listo', portalBody: 'KiguFlow será tu espacio central para consultar avances, tareas, actualizaciones, briefs, archivos y entregables.', portalCta: 'Abrir tu portal de cliente →', tour: 'Ver el recorrido de KiguFlow →', kickoff: 'Conozcámonos y hablemos de tu proyecto', kickoffBody: 'Nuestra primera llamada será una conversación de aproximadamente 30 minutos sobre tu negocio, objetivos, audiencia, prioridades y la forma en que mediremos el éxito.', kickoffCta: 'Agendar la llamada inicial →', cliq: 'Comunicación a través de Zoho Cliq', cliqBody: 'Usaremos Zoho Cliq para las preguntas, actualizaciones y comunicación cotidiana del proyecto.', cliqCta: 'Ver la guía de Zoho Cliq →', contact: '¿Tenés alguna consulta? Hablemos directamente', contactBody: 'Este correo se envió automáticamente y las respuestas podrían no ser monitoreadas. Si necesitás ayuda, escribime a guillermo.obando@kiguflow.com o contactame por Zoho Cliq.', closing: `Eso es todo por ahora. ¡Bienvenido a bordo, ${firstName}!`, signature: 'Guillermo Obando\nIngeniero de Software\nKiguFlow',
  } : {
    subject: `Payment received ✓ — Welcome to ${input.projectName}`, greeting: `Hi ${firstName},`, welcome: `Welcome aboard! I'm excited to get started on ${input.projectName}. Your project space is ready, and we'll keep everything organized in one place as we move through the process together.`, paid: '✓ Payment received', payment: `Your ${input.paymentType} payment of ${input.paymentAmount} has been received and registered. Thank you. This officially begins the onboarding stage.`, portal: 'Your project space is ready', portalBody: 'KiguFlow will be your central workspace for progress, tasks, updates, briefs, files, and deliverables.', portalCta: 'Open your client portal →', tour: 'Watch the KiguFlow tour →', kickoff: "Let's get to know each other", kickoffBody: "Our first call is a 30-minute conversation about your business, goals, audience, priorities, and what success looks like for your project.", kickoffCta: 'Schedule your kickoff call →', cliq: 'Communication through Zoho Cliq', cliqBody: "We'll use Zoho Cliq for day-to-day questions, updates, and project communication.", cliqCta: 'Watch the Zoho Cliq guide →', contact: 'Questions? Talk to me directly', contactBody: 'This email was sent automatically, so replies may not be monitored. If you need anything, email guillermo.obando@kiguflow.com or contact me through Zoho Cliq.', closing: `That's everything for now. Welcome aboard, ${firstName}!`, signature: 'Guillermo Obando\nSoftware Engineer\nKiguFlow',
  };
  const link = (url: string | undefined, label: string, primary = false) => url ? `<p><a href="${escapeHtml(url)}" style="display:inline-block;padding:${primary ? '14px 22px' : '0'};border-radius:8px;background:${primary ? '#4ade80' : 'transparent'};color:${primary ? '#010a04' : '#147a3e'};font-weight:700;text-decoration:${primary ? 'none' : 'underline'}">${escapeHtml(label)}</a></p>` : '';
  const section = (title: string, body: string, extra = '') => `<tr><td style="padding:26px 32px;border-top:1px solid #d8ddd9"><h2 style="margin:0 0 10px;font-size:20px;color:#15201b">${escapeHtml(title)}</h2><p style="margin:0;line-height:1.65;color:#4b5650">${escapeHtml(body)}</p>${extra}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f2e9;font-family:Arial,sans-serif;color:#15201b"><table role="presentation" width="100%"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" style="max-width:600px;background:#fffdfa;border:1px solid #d8ddd9;border-radius:12px;overflow:hidden"><tr><td style="padding:30px 32px;background:#010a04;color:#fff"><strong style="color:#4ade80;font-size:20px">KiguFlow</strong><h1 style="font-size:28px;margin:22px 0 10px">${escapeHtml(copy.greeting)}</h1><p style="margin:0;line-height:1.65;color:#d4dad6">${escapeHtml(copy.welcome)}</p></td></tr>${section(copy.paid, copy.payment)}${section(copy.portal, copy.portalBody, link(input.portalUrl, copy.portalCta, true) + link(input.portalTourUrl, copy.tour))}${section(copy.kickoff, copy.kickoffBody, link(input.calendarUrl, copy.kickoffCta, true))}${section(copy.cliq, copy.cliqBody, link(input.cliqTourUrl, copy.cliqCta))}${section(copy.contact, copy.contactBody)}<tr><td style="padding:26px 32px;border-top:1px solid #d8ddd9"><p style="line-height:1.65">${escapeHtml(copy.closing)}</p><p style="white-space:pre-line;color:#4b5650">${escapeHtml(copy.signature)}</p></td></tr></table></td></tr></table></body></html>`;
  const text = [copy.greeting, copy.welcome, copy.paid, copy.payment, copy.portal, copy.portalBody, `${copy.portalCta} ${input.portalUrl}`, input.portalTourUrl && `${copy.tour} ${input.portalTourUrl}`, copy.kickoff, copy.kickoffBody, input.calendarUrl && `${copy.kickoffCta} ${input.calendarUrl}`, copy.cliq, copy.cliqBody, input.cliqTourUrl && `${copy.cliqCta} ${input.cliqTourUrl}`, copy.contact, copy.contactBody, copy.closing, copy.signature].filter(Boolean).join('\n\n');
  return { subject: copy.subject, html, text };
}

export async function sendOnboardingEmail(env: MailEnv, input: OnboardingInput) {
  await sendEmail(env, { to: input.to, ...renderOnboardingEmail(input) });
}

export async function sendProblemReportNotification(env: MailEnv, input: { to: string; clientName: string; projectName: string; category: string; subject: string; description: string; createdAt: Date; taskUrl: string }) {
  const details = `${input.clientName}\n${input.projectName}\n${input.category}\n${input.subject}\n${input.description}\n${input.createdAt.toISOString()}\n${input.taskUrl}`;
  await sendEmail(env, { to: input.to, subject: `New client issue — ${input.projectName}`, text: details, html: `<p>A client has submitted a new problem report.</p><dl><dt>Client</dt><dd>${escapeHtml(input.clientName)}</dd><dt>Project</dt><dd>${escapeHtml(input.projectName)}</dd><dt>Category</dt><dd>${escapeHtml(input.category)}</dd><dt>Subject</dt><dd>${escapeHtml(input.subject)}</dd><dt>Description</dt><dd style="white-space:pre-wrap">${escapeHtml(input.description)}</dd><dt>Submitted</dt><dd>${escapeHtml(input.createdAt.toISOString())}</dd></dl><p><a href="${escapeHtml(input.taskUrl)}">Open the related task</a></p>` });
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
