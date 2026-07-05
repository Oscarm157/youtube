"use client";

import { motion, useReducedMotion } from "motion/react";
import type { DashboardMetrics } from "@/lib/crm-metrics";
import { OwnerChip } from "@/components/crm/status";
import { fmtMoney } from "./format";

export function AgentTable({ byAgent }: { byAgent: DashboardMetrics["byAgent"] }) {
  const reduce = useReducedMotion();
  // Más leads primero; los sin actividad quedan al final.
  const rows = [...byAgent].sort((a, b) => b.leads - a.leads || b.value - a.value);
  const maxLeads = Math.max(1, ...rows.map((r) => r.leads));

  return (
    <div className="crm-card overflow-hidden p-0">
      <div className="p-5 pb-4">
        <h2 className="crm-h2">Por agente</h2>
        <p className="mt-1 text-[12px]" style={{ color: "var(--crm-ink-mute)" }}>
          Leads asignados y cierres del periodo
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 pb-6 text-[13px]" style={{ color: "var(--crm-ink-mute)" }}>
          Sin datos en este periodo.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="crm-table min-w-[560px]">
            <thead className="crm-thead">
              <tr>
                <th className="crm-th">Agente</th>
                <th className="crm-th" style={{ width: "26%" }}>
                  Leads
                </th>
                <th className="crm-th text-right">Ganado</th>
                <th className="crm-th text-right">Conversión</th>
                <th className="crm-th text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => {
                const share = (a.leads / maxLeads) * 100;
                const lead = i === 0 && a.leads > 0;
                return (
                  <motion.tr
                    key={a.id ?? "unassigned"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.035 }}
                    className="crm-row"
                  >
                    <td className="crm-td">
                      <OwnerChip name={a.name} id={a.id ?? a.name} />
                    </td>
                    <td className="crm-td">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="crm-num w-6 shrink-0 text-[13px] font-medium tabular-nums"
                          style={{ color: "var(--crm-ink)" }}
                        >
                          {a.leads}
                        </span>
                        <div
                          className="h-1.5 flex-1 overflow-hidden rounded-full"
                          style={{ background: "var(--crm-surface)" }}
                        >
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background: lead ? "var(--crm-accent)" : "var(--crm-line-strong)",
                              width: `${Math.max(3, share)}%`,
                              transformOrigin: "left center",
                            }}
                            initial={{ scaleX: reduce ? 1 : 0 }}
                            animate={{ scaleX: 1 }}
                            transition={reduce ? { duration: 0 } : {
                              duration: 0.6,
                              delay: 0.1 + i * 0.035,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td
                      className="crm-td crm-num text-right text-[13px] tabular-nums"
                      style={{ color: "var(--crm-ink-soft)" }}
                    >
                      {a.won}
                    </td>
                    <td
                      className="crm-td crm-num text-right text-[13px] tabular-nums"
                      style={{ color: "var(--crm-ink-soft)" }}
                    >
                      {a.conversionRate === 0 && a.won === 0
                        ? "–"
                        : `${Math.round(a.conversionRate * 100)}%`}
                    </td>
                    <td
                      className="crm-td crm-num text-right text-[13px] font-medium tabular-nums"
                      style={{ color: a.value > 0 ? "var(--crm-accent-strong)" : "var(--crm-ink-mute)" }}
                    >
                      {a.value > 0 ? fmtMoney(a.value) : "–"}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
