import { and, count, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { leads, users, type LeadSource, type LeadStatus, type UserRole } from "./schema";
import { canViewAllLeads } from "./permissions";
import { STATUS_ORDER } from "./crm-status";

export type DashboardFilters = { from?: Date; to?: Date; owner?: string; source?: string };

export type DashboardMetrics = {
  totals: {
    leads: number;
    won: number;
    lost: number;
    conversionRate: number;
    pipelineValue: number;
    wonValue: number;
    avgDaysToClose: number | null;
  };
  funnel: { status: LeadStatus; count: number; value: number }[];
  bySource: { source: string; count: number }[];
  byService: { label: string; count: number }[];
  byAgent: {
    id: string | null;
    name: string;
    leads: number;
    won: number;
    conversionRate: number;
    value: number;
  }[];
  trend: { period: string; count: number }[];
};

export async function getDashboardMetrics(
  viewer: { id: string; role: UserRole },
  filters: DashboardFilters = {}
): Promise<DashboardMetrics> {
  const { from, to, owner, source } = filters;

  // Filtros base que aplican a todas las métricas: scope de seguridad + owner + source.
  const base: SQL[] = [];
  if (!canViewAllLeads(viewer.role)) base.push(eq(leads.assignedTo, viewer.id));
  if (owner) base.push(eq(leads.assignedTo, owner));
  if (source) base.push(eq(leads.source, source as LeadSource));

  // Fecha por createdAt (creación dentro del rango).
  const createdRange: SQL[] = [];
  if (from) createdRange.push(gte(leads.createdAt, from));
  if (to) createdRange.push(lte(leads.createdAt, to));

  // Fecha por closedAt (cierre dentro del rango).
  const closedRange: SQL[] = [];
  if (from) closedRange.push(gte(leads.closedAt, from));
  if (to) closedRange.push(lte(leads.closedAt, to));

  const createdWhere = and(...base, ...createdRange);

  // ---- totals.leads / newLeads (creados en el rango con filtros) ----
  const leadsCountRow = await db
    .select({ c: count() })
    .from(leads)
    .where(createdWhere);
  const leadsCreated = leadsCountRow[0]?.c ?? 0;

  // ---- won / lost / wonValue / avgDaysToClose / conversionRate (por closedAt) ----
  const closedAgg = await db
    .select({
      status: leads.status,
      c: count(),
      value: sql<number>`coalesce(sum(${leads.valueAmount}), 0)`,
      avgDays: sql<number | null>`avg(extract(epoch from (${leads.closedAt} - ${leads.createdAt})) / 86400)`,
    })
    .from(leads)
    .where(and(...base, ...closedRange))
    .groupBy(leads.status);

  let won = 0;
  let lost = 0;
  let wonValue = 0;
  let avgDaysToClose: number | null = null;
  for (const r of closedAgg) {
    if (r.status === "won") {
      won = r.c;
      wonValue = Number(r.value);
      avgDaysToClose = r.avgDays === null ? null : Number(r.avgDays);
    } else if (r.status === "lost") {
      lost = r.c;
    }
  }
  const conversionRate = won + lost > 0 ? won / (won + lost) : 0;

  // ---- pipelineValue: snapshot ACTUAL, ignora el rango de fecha a propósito; respeta owner/source ----
  const pipelineRow = await db
    .select({ value: sql<number>`coalesce(sum(${leads.valueAmount}), 0)` })
    .from(leads)
    .where(and(...base, sql`${leads.status} in ('new','contacted','following_up','proposal')`));
  const pipelineValue = Number(pipelineRow[0]?.value ?? 0);

  // ---- funnel: count + value por status (creados en el rango), todos los status en STATUS_ORDER ----
  const funnelRows = await db
    .select({
      status: leads.status,
      c: count(),
      value: sql<number>`coalesce(sum(${leads.valueAmount}), 0)`,
    })
    .from(leads)
    .where(createdWhere)
    .groupBy(leads.status);
  const funnelMap = new Map(funnelRows.map((r) => [r.status, r]));
  const funnel = STATUS_ORDER.map((status) => {
    const r = funnelMap.get(status);
    return { status, count: r?.c ?? 0, value: Number(r?.value ?? 0) };
  });

  // ---- bySource (creados en el rango) ----
  const sourceRows = await db
    .select({ source: leads.source, c: count() })
    .from(leads)
    .where(createdWhere)
    .groupBy(leads.source)
    .orderBy(desc(count()));
  const bySource = sourceRows.map((r) => ({ source: r.source, count: r.c }));

  // ---- byService: qualification->>'service', fallback 'industry', null => "Sin clasificar" ----
  const serviceExpr = sql<string>`coalesce(nullif(${leads.qualification} ->> 'service', ''), nullif(${leads.qualification} ->> 'industry', ''), 'Uncategorized')`;
  const serviceRows = await db
    .select({ label: serviceExpr, c: count() })
    .from(leads)
    .where(createdWhere)
    .groupBy(serviceExpr)
    .orderBy(desc(count()));
  const byService = serviceRows.map((r) => ({ label: r.label, count: r.c }));

  // ---- byAgent ----
  // leads por agente: creados en el rango (createdWhere).
  const agentLeadRows = await db
    .select({
      id: leads.assignedTo,
      name: sql<string | null>`${users.name}`,
      c: count(),
    })
    .from(leads)
    .leftJoin(users, eq(leads.assignedTo, users.id))
    .where(createdWhere)
    .groupBy(leads.assignedTo, users.name);

  // won/lost/value por agente: cerrados en el rango (closedRange).
  const agentClosedRows = await db
    .select({
      id: leads.assignedTo,
      name: sql<string | null>`${users.name}`,
      status: leads.status,
      c: count(),
      value: sql<number>`coalesce(sum(${leads.valueAmount}), 0)`,
    })
    .from(leads)
    .leftJoin(users, eq(leads.assignedTo, users.id))
    .where(and(...base, ...closedRange))
    .groupBy(leads.assignedTo, users.name, leads.status);

  type AgentAcc = { id: string | null; name: string; leads: number; won: number; lost: number; value: number };
  const agents = new Map<string, AgentAcc>();
  const keyOf = (id: string | null) => id ?? "__unassigned__";
  const getAgent = (id: string | null, name: string | null): AgentAcc => {
    const k = keyOf(id);
    let a = agents.get(k);
    if (!a) {
      a = { id, name: id ? name ?? "" : "Unassigned", leads: 0, won: 0, lost: 0, value: 0 };
      agents.set(k, a);
    }
    return a;
  };
  for (const r of agentLeadRows) getAgent(r.id, r.name).leads = r.c;
  for (const r of agentClosedRows) {
    const a = getAgent(r.id, r.name);
    if (a.name === "" && r.name) a.name = r.name;
    if (r.status === "won") {
      a.won = r.c;
      a.value = Number(r.value);
    } else if (r.status === "lost") {
      a.lost = r.c;
    }
  }
  const byAgent = [...agents.values()].map((a) => ({
    id: a.id,
    name: a.name,
    leads: a.leads,
    won: a.won,
    conversionRate: a.won + a.lost > 0 ? a.won / (a.won + a.lost) : 0,
    value: a.value,
  }));

  // ---- trend: buckets semanales (lunes) por createdAt ----
  const weekExpr = sql<string>`to_char(date_trunc('week', ${leads.createdAt}), 'YYYY-MM-DD')`;
  const trendRows = await db
    .select({ period: weekExpr, c: count() })
    .from(leads)
    .where(createdWhere)
    .groupBy(weekExpr)
    .orderBy(weekExpr);
  const trend = trendRows.map((r) => ({ period: r.period, count: r.c }));

  return {
    totals: {
      leads: leadsCreated,
      won,
      lost,
      conversionRate,
      pipelineValue,
      wonValue,
      avgDaysToClose,
    },
    funnel,
    bySource,
    byService,
    byAgent,
    trend,
  };
}
