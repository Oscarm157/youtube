import Link from "next/link";
import { Inbox, ArrowDown, ChevronsUpDown, ArrowUpRight } from "lucide-react";
import { getLeads, getUsersBasic, getActiveUsers } from "@/lib/crm-data";
import { getCurrentUser } from "@/lib/session";
import { canViewAllLeads, isReadOnly } from "@/lib/permissions";
import type { LeadStatus } from "@/lib/schema";
import { fmtDate } from "@/lib/crm-format";
import { StatusBadge, SourceBadge, OwnerChip, STATUS_META, STATUS_ORDER } from "@/components/crm/status";
import { NewLeadModal } from "@/components/crm/NewLeadModal";
import { LeadFilters } from "@/components/crm/LeadFilters";
import { PageHeader } from "@/components/crm/PageShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads", robots: { index: false } };

const PAGE_SIZE = 25;

type SortKey = "recent" | "name" | "status";

const SortIcon = ({ on }: { on: boolean }) =>
  on ? (
    <ArrowDown className="size-3 text-[var(--crm-accent-strong)]" />
  ) : (
    <ChevronsUpDown className="size-3 opacity-35" />
  );

export default async function LeadsList({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    search?: string;
    owner?: string;
    source?: string;
    sort?: string;
    unassigned?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const me = await getCurrentUser();
  if (!me) return null;

  const canSeeAll = canViewAllLeads(me.role);
  const readOnly = isReadOnly(me.role);
  const canCreate = !readOnly;

  const status = STATUS_ORDER.includes(sp.status as LeadStatus) ? (sp.status as LeadStatus) : undefined;
  const sort = (["recent", "name", "status"].includes(sp.sort ?? "") ? sp.sort : "recent") as SortKey;
  const unassigned = canSeeAll && sp.unassigned === "1";
  const page = Math.max(1, Number(sp.page) || 1);

  const opts = {
    search: sp.search?.trim() || undefined,
    status,
    owner: sp.owner || undefined,
    source: sp.source || undefined,
    sort,
    unassigned,
    page,
    pageSize: PAGE_SIZE,
  };

  const [{ rows: leads, total }, usersList, activeUsers] = await Promise.all([
    getLeads({ id: me.id, role: me.role }, opts),
    getUsersBasic(),
    getActiveUsers(),
  ]);
  const userMap = new Map(usersList.map((u) => [u.id, u]));

  // Status tab counts come from a separate scoped query per tab so the numbers
  // stay correct under the active search/owner/source filters.
  const countOpts = { ...opts, status: undefined, page: 1, pageSize: 1 };
  const [allCount, ...statusCounts] = await Promise.all([
    getLeads({ id: me.id, role: me.role }, countOpts).then((r) => r.total),
    ...STATUS_ORDER.map((s) =>
      getLeads({ id: me.id, role: me.role }, { ...countOpts, status: s }).then((r) => r.total)
    ),
  ]);
  const counts: Record<string, number> = { all: allCount };
  STATUS_ORDER.forEach((s, i) => (counts[s] = statusCounts[i]));

  const active = (status ?? "all") as "all" | LeadStatus;
  const tabs: { key: "all" | LeadStatus; label: string }[] = [
    { key: "all", label: "Todos" },
    ...STATUS_ORDER.map((s) => ({ key: s, label: STATUS_META[s].label })),
  ];

  // Build a status-tab href that preserves every other active param.
  const tabHref = (key: "all" | LeadStatus) => {
    const p = new URLSearchParams();
    if (opts.search) p.set("search", opts.search);
    if (opts.owner) p.set("owner", opts.owner);
    if (opts.source) p.set("source", opts.source);
    if (sort !== "recent") p.set("sort", sort);
    if (unassigned) p.set("unassigned", "1");
    if (key !== "all") p.set("status", key);
    const s = p.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    if (opts.search) p.set("search", opts.search);
    if (status) p.set("status", status);
    if (opts.owner) p.set("owner", opts.owner);
    if (opts.source) p.set("source", opts.source);
    if (sort !== "recent") p.set("sort", sort);
    if (unassigned) p.set("unassigned", "1");
    if (n > 1) p.set("page", String(n));
    const s = p.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  // Orden por columna: reusa los sort keys que ya soporta getLeads (recent/name/status).
  const sortHref = (key: SortKey) => {
    const p = new URLSearchParams();
    if (opts.search) p.set("search", opts.search);
    if (status) p.set("status", status);
    if (opts.owner) p.set("owner", opts.owner);
    if (opts.source) p.set("source", opts.source);
    if (key !== "recent") p.set("sort", key);
    if (unassigned) p.set("unassigned", "1");
    const s = p.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, total);
  const filtered = Boolean(opts.search || opts.owner || opts.source || status || unassigned);

  return (
    <div>
      <PageHeader
        eyebrow="Comercial"
        title="Leads"
        actions={canCreate ? <NewLeadModal /> : undefined}
      >
        <div className="mt-2 flex items-center gap-2 text-[13px] text-[var(--crm-ink-soft)]">
          <span>
            <span className="crm-num font-medium text-[var(--crm-ink)]">{total}</span>{" "}
            {total === 1 ? "lead" : "leads"}
          </span>
          {readOnly && (
            <span className="rounded-md border border-[var(--crm-line-strong)] bg-[var(--crm-surface-2)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--crm-ink-mute)]">
              Solo lectura
            </span>
          )}
        </div>
      </PageHeader>

      <LeadFilters owners={activeUsers} showOwner={canSeeAll} showUnassigned={canSeeAll} />

      <div className="crm-fade mt-5 flex flex-wrap items-center gap-1.5">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <Link key={t.key} href={tabHref(t.key)} scroll={false} data-active={on} className="crm-tab">
              {t.label}
              <span className="crm-tab-count crm-num text-[11.5px] text-[var(--crm-ink-mute)]">
                {counts[t.key]}
              </span>
            </Link>
          );
        })}
      </div>

      {leads.length === 0 ? (
        <div className="crm-empty crm-fade mt-6 px-6 py-16">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--crm-accent-tint)]">
            <Inbox className="size-5 text-[var(--crm-accent-strong)]" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-[15px] font-semibold text-[var(--crm-ink)]">
            {filtered ? "Sin coincidencias" : "Aún no hay leads"}
          </p>
          <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-[var(--crm-ink-soft)]">
            {filtered
              ? "Quita la búsqueda o los filtros para ampliar los resultados."
              : "Los leads del chat del sitio y de los formularios aparecen aquí, junto con los que agregues."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <ul className="mt-4 space-y-2.5 sm:hidden">
            {leads.map((lead, i) => {
              const ql = lead.qualification ?? {};
              const owner = lead.assignedTo ? userMap.get(lead.assignedTo) : null;
              const chips = [ql.service ?? ql.industry, ql.monthlyVolume].filter(Boolean) as string[];
              return (
                <li key={lead.id} className="crm-fade" style={{ animationDelay: `${Math.min(i, 12) * 24}ms` }}>
                  <Link
                    href={`/admin/${lead.id}`}
                    className="crm-card block p-4 transition-colors active:bg-[var(--crm-surface-3)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[15px] font-semibold text-[var(--crm-ink)]">{lead.name ?? "Sin nombre"}</span>
                      <StatusBadge status={lead.status} />
                    </div>
                    <div className="mt-1 flex flex-col gap-0.5 text-[12.5px] text-[var(--crm-ink-soft)]">
                      {lead.email && <span className="break-all">{lead.email}</span>}
                      {lead.phone && <span className="crm-num">{lead.phone}</span>}
                    </div>
                    {chips.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {chips.map((c, j) => (
                          <span key={j} className="rounded-md bg-[var(--crm-surface-3)] px-2 py-0.5 text-[11.5px] text-[var(--crm-ink-soft)]">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-3 border-t border-[var(--crm-line)] pt-2.5">
                      <SourceBadge source={lead.source} />
                      {owner ? (
                        <OwnerChip name={owner.name} id={owner.id} />
                      ) : (
                        <span className="text-[12px] text-[var(--crm-ink-mute)]">Sin asignar</span>
                      )}
                      <span className="crm-num ml-auto text-[12px] text-[var(--crm-ink-mute)]">{fmtDate(lead.createdAt)}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Desktop: table */}
          <div className="mt-4 hidden overflow-hidden rounded-[var(--crm-r-lg)] border border-[var(--crm-line)] sm:block">
            <div className="overflow-x-auto">
              <table className="crm-table min-w-[900px]">
                <thead className="crm-thead">
                  <tr>
                    <th className="crm-th">
                      <Link href={sortHref("name")} scroll={false} className="crm-th-sort inline-flex items-center gap-1">
                        Nombre
                        <SortIcon on={sort === "name"} />
                      </Link>
                    </th>
                    <th className="crm-th">Contacto</th>
                    <th className="crm-th">Origen</th>
                    <th className="crm-th">Responsable</th>
                    <th className="crm-th">Interés</th>
                    <th className="crm-th">Volumen</th>
                    <th className="crm-th">
                      <Link href={sortHref("status")} scroll={false} className="crm-th-sort inline-flex items-center gap-1">
                        Estado
                        <SortIcon on={sort === "status"} />
                      </Link>
                    </th>
                    <th className="crm-th">
                      <Link href={sortHref("recent")} scroll={false} className="crm-th-sort inline-flex items-center gap-1">
                        Recibido
                        <SortIcon on={sort === "recent"} />
                      </Link>
                    </th>
                    <th className="crm-th w-8" aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, i) => {
                    const ql = lead.qualification ?? {};
                    const owner = lead.assignedTo ? userMap.get(lead.assignedTo) : null;
                    return (
                      <tr
                        key={lead.id}
                        className="crm-row crm-fade group relative cursor-pointer"
                        style={{ animationDelay: `${Math.min(i, 14) * 20}ms` }}
                      >
                        <td className="crm-td">
                          <Link
                            href={`/admin/${lead.id}`}
                            className="inline-flex items-center gap-1.5 before:absolute before:inset-0 before:content-['']"
                          >
                            <span className="text-[14px] font-semibold text-[var(--crm-ink)] transition-colors group-hover:text-[var(--crm-accent-strong)]">
                              {lead.name ?? "Sin nombre"}
                            </span>
                            <span className="rounded border border-[var(--crm-line-strong)] px-1 py-0.5 text-[9px] font-medium uppercase text-[var(--crm-ink-mute)]">
                              {lead.locale === "es" ? "ES" : "EN"}
                            </span>
                          </Link>
                        </td>
                        <td className="crm-td text-[12.5px] text-[var(--crm-ink-soft)]">
                          <div className="flex flex-col leading-tight">
                            {lead.email && <span className="truncate">{lead.email}</span>}
                            {lead.phone && <span className="crm-num">{lead.phone}</span>}
                          </div>
                        </td>
                        <td className="crm-td">
                          <SourceBadge source={lead.source} />
                        </td>
                        <td className="crm-td whitespace-nowrap">
                          {owner ? (
                            <OwnerChip name={owner.name} id={owner.id} />
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--crm-ink-mute)]">
                              <span className="size-1.5 rounded-full bg-[var(--crm-line-strong)]" />
                              Sin asignar
                            </span>
                          )}
                        </td>
                        <td className="crm-td text-[12.5px] text-[var(--crm-ink-soft)]">{ql.service ?? ql.industry ?? "–"}</td>
                        <td className="crm-td text-[12.5px] text-[var(--crm-ink-soft)]">{ql.monthlyVolume ?? "–"}</td>
                        <td className="crm-td">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="crm-td crm-num whitespace-nowrap text-[12px] text-[var(--crm-ink-mute)]">{fmtDate(lead.createdAt)}</td>
                        <td className="crm-td w-8 pr-4 text-right">
                          <ArrowUpRight className="ml-auto size-3.5 text-[var(--crm-ink-faint)] opacity-0 transition-opacity group-hover:opacity-100" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="crm-num text-[12.5px] text-[var(--crm-ink-soft)]">
              {firstShown}–{lastShown} de {total}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                {page > 1 ? (
                  <Link href={pageHref(page - 1)} scroll={false} className="crm-btn crm-btn-secondary crm-btn-sm">Anterior</Link>
                ) : (
                  <button type="button" disabled className="crm-btn crm-btn-secondary crm-btn-sm">Anterior</button>
                )}
                <span className="crm-num px-1.5 text-[12.5px] text-[var(--crm-ink-soft)]">
                  {page} / {totalPages}
                </span>
                {page < totalPages ? (
                  <Link href={pageHref(page + 1)} scroll={false} className="crm-btn crm-btn-secondary crm-btn-sm">Siguiente</Link>
                ) : (
                  <button type="button" disabled className="crm-btn crm-btn-secondary crm-btn-sm">Siguiente</button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
