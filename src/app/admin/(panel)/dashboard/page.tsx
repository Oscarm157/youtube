import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canViewDashboard, isReadOnly } from "@/lib/permissions";
import { getDashboardMetrics } from "@/lib/crm-metrics";
import { getActiveUsers } from "@/lib/crm-data";
import { PageHeader } from "@/components/crm/PageShell";
import { DashboardFilters } from "@/components/crm/dashboard/DashboardFilters";
import { KpiCards } from "@/components/crm/dashboard/KpiCards";
import { Funnel } from "@/components/crm/dashboard/Funnel";
import { TrendChart } from "@/components/crm/dashboard/TrendChart";
import { SourceBreakdown } from "@/components/crm/dashboard/SourceBreakdown";
import { ServiceBreakdown } from "@/components/crm/dashboard/ServiceBreakdown";
import { AgentTable } from "@/components/crm/dashboard/AgentTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard", robots: { index: false } };

type Range = "month" | "30d" | "90d" | "year" | "all";
const RANGES: Range[] = ["month", "30d", "90d", "year", "all"];

const RANGE_COPY: Record<Range, string> = {
  month: "este mes",
  "30d": "los últimos 30 días",
  "90d": "los últimos 90 días",
  year: "lo que va del año",
  all: "todo el historial",
};

// Calcula la ventana [from, to] a partir del rango seleccionado.
function rangeWindow(range: Range): { from?: Date; to?: Date } {
  const now = new Date();
  if (range === "all") return {};
  if (range === "month") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
  if (range === "year") {
    return { from: new Date(now.getFullYear(), 0, 1), to: now };
  }
  const days = range === "90d" ? 90 : 30;
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  return { from, to: now };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; owner?: string; source?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!canViewDashboard(me.role)) redirect("/admin");

  const sp = await searchParams;
  const range: Range = RANGES.includes(sp.range as Range) ? (sp.range as Range) : "30d";
  const { from, to } = rangeWindow(range);

  const [metrics, agents] = await Promise.all([
    getDashboardMetrics(
      { id: me.id, role: me.role },
      { from, to, owner: sp.owner, source: sp.source }
    ),
    getActiveUsers(),
  ]);

  const readOnly = isReadOnly(me.role);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Comercial"
        title="Dashboard"
        description={`Actividad de leads en ${RANGE_COPY[range]}.`}
        actions={<DashboardFilters agents={agents} showAgent />}
      >
        {readOnly && (
          <span className="crm-badge mt-2.5 inline-flex">Solo lectura</span>
        )}
      </PageHeader>

      <KpiCards totals={metrics.totals} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendChart trend={metrics.trend} />
        </div>
        <Funnel funnel={metrics.funnel} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SourceBreakdown bySource={metrics.bySource} />
        <ServiceBreakdown byService={metrics.byService} />
      </div>

      <AgentTable byAgent={metrics.byAgent} />
    </div>
  );
}
