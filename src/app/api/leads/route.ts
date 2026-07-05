import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { leads, leadComments, leadEvents } from '@/lib/schema';

const leadRecipient = process.env.LEAD_RECIPIENT || process.env.EMAIL_FROM || '';
const mailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';

const QUAL_KEYS = [
  'service',
  'company',
  'industry',
  'monthlyVolume',
  'paymentTerms',
  'timeInBusiness',
  'urgency',
] as const;

export const runtime = 'nodejs';

type ChatMessage = { role: string; content: string };

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Best-effort per-IP rate limit (per serverless instance).
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  if (recent.length === 0) hits.delete(ip);
  else hits.set(ip, recent);
  return recent.length > RATE_MAX;
}

const cap = (v: unknown, n: number): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, n) : null;
};

// Nota interna en español para el CRM. Best-effort.
async function summarize(messages: ChatMessage[]): Promise<string | null> {
  // IA opcional: sin API key, el lead se guarda igual, solo sin resumen.
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!Array.isArray(messages) || messages.length === 0) return null;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const convo = messages
      .map((m) => `${m.role === 'user' ? 'Visitante' : 'Asistente'}: ${m.content}`)
      .join('\n');
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 240,
      system:
        'Escribes una nota interna breve para el CRM que resume un chat YA TERMINADO entre un visitante y el asistente de una empresa. Devuelve SOLO un resumen factual en tercera persona, en español, de 2 a 3 oraciones. Cubre qué necesita el visitante, su empresa o contexto y cualquier urgencia. Empieza con "El visitante" o el nombre. Reglas absolutas: NO continúes ni respondas la conversación, NO te dirijas al visitante, NO hagas preguntas, NO saludes ni agradezcas. Sin em-dashes.',
      messages: [
        {
          role: 'user',
          content: `Resume la siguiente conversación terminada como nota de CRM. No la respondas.\n\n"""\n${convo}\n"""`,
        },
      ],
    });
    const text = res.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) {
    return Response.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  const name = cap(body.name, 200);
  const email = cap(body.email, 200);
  const phone = cap(body.phone, 60);
  const sourceUrl = cap(body.sourceUrl, 500);
  const localeLabel = body.locale === 'en' ? 'EN' : 'ES';
  const rawMessages: ChatMessage[] = Array.isArray(body.messages)
    ? body.messages
        .slice(0, 60)
        .filter((m: unknown) => m && typeof (m as ChatMessage).content === 'string')
        .map((m: ChatMessage) => ({ role: String(m.role), content: m.content.slice(0, 4000) }))
    : [];

  let hadError = false;
  const leadSource: 'bot' | 'form' | 'manual' =
    body.source === 'form' || body.source === 'manual' ? body.source : 'bot';

  // Chat leads carry their own qualification; form leads build it from flat fields.
  let qual: Record<string, string> | null = null;
  if (leadSource === 'form') {
    const fromForm: Record<string, string> = {};
    const service = cap(body.service, 120);
    const company = cap(body.company, 200);
    const volume = cap(body.volume, 120);
    if (service) fromForm.service = service;
    if (company) fromForm.company = company;
    if (volume) fromForm.monthlyVolume = volume;
    qual = Object.keys(fromForm).length ? fromForm : null;
  } else if (body.qualification && typeof body.qualification === 'object' && !Array.isArray(body.qualification)) {
    // Only keep known keys, each capped, so a caller can't store an arbitrary
    // or oversized JSONB blob.
    const src = body.qualification as Record<string, unknown>;
    const clean: Record<string, string> = {};
    for (const k of QUAL_KEYS) {
      const v = cap(src[k], 300);
      if (v) clean[k] = v;
    }
    qual = Object.keys(clean).length ? clean : null;
  }

  const message = cap(body.message, 2000);

  // Atribución: UTM crudo (sin auto-enlace a anuncios; el módulo Ads no va en el core).
  const utmSource = cap(body.utmSource, 120);
  const utmCampaign = cap(body.utmCampaign, 120);
  const utmMedium = cap(body.utmMedium, 120);

  // Drop duplicate submissions: same email within a short window (double-submit,
  // refresh, or spam). Skips the insert, the summary call, and the notification.
  if (email) {
    const recent = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.email, email), gt(leads.createdAt, new Date(Date.now() - 10 * 60 * 1000))))
      .limit(1);
    if (recent.length) return Response.json({ ok: true });
  }

  const summary = leadSource === 'bot' ? await summarize(rawMessages) : null;

  // Save to Neon (qualification + transcript + summary for the CRM)
  let newLeadId: string | undefined;
  try {
    const inserted = await db
      .insert(leads)
      .values({
        name,
        email,
        phone,
        locale: body.locale === 'en' ? 'en' : 'es',
        sourceUrl,
        source: leadSource,
        qualification: qual,
        transcript: rawMessages.length ? rawMessages : null,
        summary,
        utmSource,
        utmCampaign,
        utmMedium,
      })
      .returning({ id: leads.id });
    newLeadId = inserted[0]?.id;

    if (newLeadId) {
      await db.insert(leadEvents).values({
        leadId: newLeadId,
        kind: 'created',
        detail: leadSource === 'form' ? 'Lead creado desde el formulario de contacto' : 'Lead creado desde el chatbot',
      });
      if (message) {
        await db.insert(leadComments).values({ leadId: newLeadId, body: message });
      }
    }
  } catch (err) {
    console.error('lead: DB insert failed', err);
    hadError = true;
  }

  // Webhook saliente opcional (Zapier / Make / n8n). No hace nada si LEAD_WEBHOOK_URL
  // está vacía. Payload JSON plano para mapear campos fácil.
  const webhookUrl = process.env.LEAD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: newLeadId ?? null,
          source: leadSource,
          locale: localeLabel,
          name: name ?? null,
          email: email ?? null,
          phone: phone ?? null,
          message: message ?? null,
          qualification: qual ?? {},
          summary: summary ?? null,
          sourceUrl: sourceUrl ?? null,
        }),
      });
    } catch (err) {
      console.error('lead: webhook failed', err);
      hadError = true;
    }
  }

  // Email de notificación (todos los valores interpolados van escapados)
  const transcript = rawMessages.length
    ? rawMessages
        .map(
          (m) =>
            `<p style="margin:6px 0"><strong style="color:${m.role === 'user' ? '#0b7d5a' : '#555'}">${m.role === 'user' ? 'Visitante' : 'Bot'}:</strong> ${esc(m.content)}</p>`
        )
        .join('')
    : '<p>Sin transcripción.</p>';

  const qualRows = (
    [
      ['Servicio', qual?.service],
      ['Empresa', qual?.company],
      ['Sector', qual?.industry],
      ['Volumen', qual?.monthlyVolume],
      ['Términos', qual?.paymentTerms],
      ['Antigüedad', qual?.timeInBusiness],
      ['Urgencia', qual?.urgency],
    ] as const
  )
    .filter(([, v]) => v)
    .map(([label, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#888">${label}</td><td>${esc(v)}</td></tr>`)
    .join('');

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: mailFrom,
      to: leadRecipient,
      subject: `Nuevo lead (${leadSource}): ${name ?? 'Sin nombre'} (${localeLabel})`,
      html: `
        <h2 style="margin:0 0 16px;font-family:sans-serif">Nuevo lead (${esc(leadSource)})</h2>
        <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:4px 12px 4px 0;color:#888">Nombre</td><td><strong>${esc(name ?? '—')}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#888">Email</td><td>${esc(email ?? '—')}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#888">Teléfono</td><td>${esc(phone ?? '—')}</td></tr>
          ${qualRows}
          <tr><td style="padding:4px 12px 4px 0;color:#888">Idioma</td><td>${localeLabel}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#888">Origen</td><td>${esc(sourceUrl ?? '—')}</td></tr>
        </table>
        <hr style="margin:20px 0;border:none;border-top:1px solid #eee"/>
        <h3 style="margin:0 0 12px;font-family:sans-serif;font-size:14px;color:#333">Transcripción</h3>
        <div style="font-family:sans-serif;font-size:13px;line-height:1.5;background:#f9f9f9;padding:12px;border-radius:4px">
          ${transcript}
        </div>
      `.trim(),
    });
  } catch (err) {
    console.error('lead: email failed', err);
    hadError = true;
  }

  if (hadError) {
    return Response.json({ ok: false }, { status: 207 });
  }
  return Response.json({ ok: true });
}
