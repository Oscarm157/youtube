"use client";

import { motion, useReducedMotion } from "motion/react";
import { CountUp } from "@/components/crm/dashboard/CountUp";
import type { DashboardMetrics } from "@/lib/crm-metrics";
import { MoneyCount } from "./MoneyCount";

// Jerarquía por tamaño: el lead-count es el dato cabecera (hero, más grande);
// el resto baja de escala. El acento mint se reserva a un solo indicador:
// la barra de conversión.
const heroNum = "font-semibold text-[36px] leading-none tracking-[-0.03em] tabular-nums";
const num = "font-semibold text-[28px] leading-none tracking-[-0.025em] tabular-nums";
const money = "font-semibold text-[24px] leading-none tracking-[-0.02em] tabular-nums";

type Kpi = {
  key: string;
  label: string;
  value: number;
  display: "int" | "money" | "pct";
  empty: boolean;
  context: string;
  hero?: boolean;
};

export function KpiCards({ totals }: { totals: DashboardMetrics["totals"] }) {
  const reduce = useReducedMotion();
  const closed = totals.won + totals.lost;

  const cards: Kpi[] = [
    {
      key: "leads",
      label: "Leads del periodo",
      value: totals.leads,
      display: "int",
      empty: totals.leads === 0,
      context: totals.leads === 0 ? "Sin datos en el periodo" : "Creados en el rango",
      hero: true,
    },
    {
      key: "conversion",
      label: "Conversión",
      value: Math.round(totals.conversionRate * 100),
      display: "pct",
      empty: closed === 0,
      context: closed === 0 ? "Sin cierres aún" : `${totals.won} ganados de ${closed} cerrados`,
    },
    {
      key: "pipeline",
      label: "Valor en pipeline",
      value: totals.pipelineValue,
      display: "money",
      empty: totals.pipelineValue === 0,
      context:
        totals.pipelineValue === 0 ? "Sin oportunidades abiertas" : "Etapas abiertas, snapshot actual",
    },
    {
      key: "won",
      label: "Valor ganado",
      value: totals.wonValue,
      display: "money",
      empty: totals.wonValue === 0,
      context:
        totals.wonValue === 0
          ? "Sin cierres ganados"
          : `${totals.won} ${totals.won === 1 ? "trato ganado" : "tratos ganados"}`,
    },
    {
      key: "days",
      label: "Días promedio al cierre",
      value: totals.avgDaysToClose === null ? 0 : Math.round(totals.avgDaysToClose),
      display: "int",
      empty: totals.avgDaysToClose === null,
      context: totals.avgDaysToClose === null ? "Sin cierres en el periodo" : "De creación a cierre",
    },
  ];

  return (
    <div className="crm-card overflow-hidden p-0">
      <div
        className="grid grid-cols-2 gap-px sm:grid-cols-3 xl:grid-cols-5"
        style={{ background: "var(--crm-line)" }}
      >
        {cards.map((c, i) => {
          const sizeCls = c.empty
            ? c.hero
              ? heroNum
              : num
            : c.display === "money"
            ? money
            : c.hero
            ? heroNum
            : num;

          return (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="flex min-h-[132px] flex-col p-5"
              style={{ background: "var(--crm-surface-2)" }}
            >
              <p className="text-[12px] font-medium" style={{ color: "var(--crm-ink-mute)" }}>
                {c.label}
              </p>

              <div className="mt-auto pt-4" style={{ color: "var(--crm-ink)" }}>
                {c.empty ? (
                  <span className={sizeCls} style={{ color: "var(--crm-ink-faint)" }}>
                    –
                  </span>
                ) : c.display === "money" ? (
                  <MoneyCount value={c.value} className={sizeCls} />
                ) : (
                  <CountUp
                    value={c.value}
                    suffix={c.display === "pct" ? "%" : ""}
                    duration={1}
                    delay={0.1}
                    className={sizeCls}
                  />
                )}
              </div>

              {c.key === "conversion" && !c.empty ? (
                <div className="mt-3">
                  <div
                    className="h-1 w-full overflow-hidden rounded-full"
                    style={{ background: "var(--crm-surface)" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: "var(--crm-accent)",
                        width: `${Math.min(100, Math.max(3, c.value))}%`,
                        transformOrigin: "left center",
                      }}
                      initial={{ scaleX: reduce ? 1 : 0 }}
                      animate={{ scaleX: 1 }}
                      transition={reduce ? { duration: 0 } : { duration: 0.8, delay: 0.25 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <p className="mt-2 text-[12px] leading-snug" style={{ color: "var(--crm-ink-mute)" }}>
                    {c.context}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-[12px] leading-snug" style={{ color: "var(--crm-ink-mute)" }}>
                  {c.context}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
