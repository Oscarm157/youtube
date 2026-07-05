import { notFound } from "next/navigation";
import { Mail, Phone, Globe, CalendarClock, Lock, Sparkles } from "lucide-react";
import { Breadcrumb } from "@/components/crm/Breadcrumb";
import { getLead, getComments, getFiles, getEvents, getActiveUsers, getUserById } from "@/lib/crm-data";
import { getCurrentUser } from "@/lib/session";
import { canEditLead, isReadOnly } from "@/lib/permissions";
import { fmtDate, fmtDateTime } from "@/lib/crm-format";
import { StatusControl } from "@/components/crm/StatusControl";
import { OwnerControl } from "@/components/crm/OwnerControl";
import { SourceBadge, StatusBadge } from "@/components/crm/status";
import { LeadDetailsForm } from "@/components/crm/LeadDetailsForm";
import { DeleteLeadButton } from "@/components/crm/DeleteLeadButton";
import { KeyFacts } from "@/components/crm/KeyFacts";
import { LeadFeed } from "@/components/crm/LeadFeed";
import { addLeadComment, updateLeadDetails } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lead", robots: { index: false } };

const LOCALE_LABEL: Record<string, string> = { en: "Inglés", es: "Español" };
const usd = new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  if (!viewer) notFound();

  const lead = await getLead(id, viewer);
  if (!lead) notFound();

  const [comments, files, events, usersList] = await Promise.all([
    getComments(id),
    getFiles(id),
    getEvents(id),
    getActiveUsers(),
  ]);

  const canEdit = canEditLead(viewer, lead);
  const readOnly = isReadOnly(viewer.role);
  const editable = canEdit && !readOnly;

  const addComment = addLeadComment.bind(null, lead.id);
  const saveDetails = updateLeadDetails.bind(null, lead.id);

  // Ensure the current owner shows in the picker even if they were deactivated.
  let ownerUsers = usersList;
  if (lead.assignedTo && !usersList.some((u) => u.id === lead.assignedTo)) {
    const owner = await getUserById(lead.assignedTo);
    if (owner) ownerUsers = [...usersList, owner];
  }
  const ownerName = lead.assignedTo
    ? ownerUsers.find((u) => u.id === lead.assignedTo)?.name ?? "Asignado"
    : null;

  return (
    // El detalle de lead respira ~10% más ancho que el resto del panel (1380):
    // crece hacia el gutter disponible y tope en +140px, sin provocar scroll horizontal.
    <div style={{ marginInline: "calc(-1 * clamp(0px, 50vw - 810px, 70px))" }}>
      <Breadcrumb items={[{ label: "Leads", href: "/admin" }, { label: lead.name ?? "Lead" }]} />

      {/* Record header */}
      <header className="crm-card crm-fade mt-4 p-5 sm:p-6" style={{ animationDelay: "0ms" }}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <span
              aria-hidden
              className="hidden size-12 shrink-0 items-center justify-center rounded-[10px] border border-[var(--crm-line)] bg-[var(--crm-surface-3)] text-[15px] font-semibold tracking-tight text-[var(--crm-ink-soft)] sm:inline-flex"
            >
              {initials(lead.name)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="crm-h1 truncate sm:text-[23px]">{lead.name ?? "Sin nombre"}</h1>
                <SourceBadge source={lead.source} />
                {!editable && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--crm-line)] bg-[var(--crm-surface-2)] px-2 py-0.5 text-[12px] font-medium text-[var(--crm-ink-soft)]">
                    <Lock className="size-3" strokeWidth={2} />
                    Solo lectura
                  </span>
                )}
              </div>
              <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-[var(--crm-ink-soft)]">
                {lead.email && <Meta icon={Mail} href={`mailto:${lead.email}`}>{lead.email}</Meta>}
                {lead.phone && <Meta icon={Phone} href={`tel:${lead.phone}`}>{lead.phone}</Meta>}
                {lead.locale && <Meta icon={Globe}>{LOCALE_LABEL[lead.locale] ?? lead.locale}</Meta>}
                <Meta icon={CalendarClock}>
                  Recibido <span className="crm-num">{fmtDateTime(lead.createdAt)}</span>
                </Meta>
              </dl>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
            <OwnerControl
              leadId={lead.id}
              assignedTo={lead.assignedTo}
              users={ownerUsers}
              viewerRole={viewer.role}
              ownerName={ownerName}
            />
            <StatusControl leadId={lead.id} status={lead.status} editable={editable} />
            {viewer.role === "admin" && <DeleteLeadButton id={lead.id} />}
          </div>
        </div>
      </header>

      <KeyFacts
        items={[
          {
            label: "Valor estimado",
            value:
              lead.valueAmount != null ? (
                <span className="crm-num text-[var(--crm-accent-strong)]">{usd.format(lead.valueAmount)}</span>
              ) : (
                <span className="text-[var(--crm-ink-faint)]">Sin definir</span>
              ),
          },
          { label: "Etapa", value: <StatusBadge status={lead.status} /> },
          {
            label: "Responsable",
            value: ownerName ?? <span className="text-[var(--crm-ink-faint)]">Sin asignar</span>,
          },
          {
            label: "Servicio",
            value: lead.qualification?.service ?? <span className="text-[var(--crm-ink-faint)]">Sin definir</span>,
          },
          { label: "Origen", value: <SourceBadge source={lead.source} /> },
          { label: "Recibido", value: <span className="crm-num">{fmtDate(lead.createdAt)}</span> },
        ]}
      />

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* Feed spine: actividad / notas / archivos en un solo workspace tabulado */}
        <div className="crm-card crm-fade overflow-hidden" style={{ animationDelay: "60ms" }}>
          {lead.summary && (
            <div className="flex gap-3 border-b border-[var(--crm-line)] bg-[var(--crm-accent-tint)] px-5 py-4">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--crm-accent-strong)]" strokeWidth={2} />
              <div className="min-w-0">
                <p className="crm-eyebrow mb-1.5 text-[var(--crm-accent-strong)]">Resumen con IA</p>
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--crm-ink-soft)]">
                  {lead.summary}
                </p>
              </div>
            </div>
          )}
          <div className="p-5">
            <LeadFeed
              events={events}
              comments={comments}
              files={files.map((f) => ({ id: f.id, name: f.name, contentType: f.contentType, size: f.size }))}
              leadId={lead.id}
              editable={editable}
              addComment={addComment}
            />
          </div>
        </div>

        {/* Property rail: calificación key/value editable + procedencia */}
        <div className="lg:sticky lg:top-[76px] lg:self-start">
          <div className="crm-card crm-fade p-5" style={{ animationDelay: "120ms" }}>
            <LeadDetailsForm
              action={saveDetails}
              editable={editable}
              lead={{
                name: lead.name,
                email: lead.email,
                phone: lead.phone,
                locale: lead.locale,
                source: lead.source,
                summary: lead.summary,
                qualification: lead.qualification,
                valueAmount: lead.valueAmount,
              }}
            />
            <div className="mt-5 border-t border-[var(--crm-line)] pt-4">
              <p className="crm-eyebrow mb-2">Procedencia</p>
              <p className="break-all text-[13px] leading-relaxed text-[var(--crm-ink-soft)]">
                {lead.sourceUrl ?? "Agregado manualmente"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({
  icon: Icon,
  href,
  children,
}: {
  icon: typeof Mail;
  href?: string;
  children: React.ReactNode;
}) {
  const inner = (
    <>
      <Icon className="size-4 shrink-0 text-[var(--crm-ink-mute)]" strokeWidth={1.75} />
      <span className="truncate">{children}</span>
    </>
  );
  if (href) {
    return (
      <a href={href} className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--crm-ink)]">
        {inner}
      </a>
    );
  }
  return <span className="inline-flex items-center gap-1.5">{inner}</span>;
}
