"use client";

import type { DashboardMetrics } from "@/lib/crm-metrics";
import { Breakdown } from "./Breakdown";

export function ServiceBreakdown({ byService }: { byService: DashboardMetrics["byService"] }) {
  // Top 6 servicios para que la lista no se vuelva interminable.
  const rows = byService.slice(0, 6).map((r) => ({ label: r.label, count: r.count }));

  return (
    <Breakdown
      title="Por servicio"
      subtitle="Interés declarado en cada lead"
      rows={rows}
      emptyCopy="Sin datos en este periodo."
    />
  );
}
