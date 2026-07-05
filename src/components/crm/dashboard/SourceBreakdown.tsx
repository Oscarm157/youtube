"use client";

import type { DashboardMetrics } from "@/lib/crm-metrics";
import { Breakdown } from "./Breakdown";

const SOURCE_LABELS: Record<string, string> = {
  bot: "Chatbot",
  form: "Formulario",
  manual: "Manual",
};

export function SourceBreakdown({ bySource }: { bySource: DashboardMetrics["bySource"] }) {
  const rows = bySource.map((r) => ({
    label: SOURCE_LABELS[r.source] ?? r.source,
    count: r.count,
  }));

  return (
    <Breakdown
      title="Por origen"
      subtitle="De dónde vienen los leads del periodo"
      rows={rows}
      emptyCopy="Sin datos en este periodo."
    />
  );
}
