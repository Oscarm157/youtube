"use client";

import { motion, useReducedMotion } from "motion/react";
import type { DashboardMetrics } from "@/lib/crm-metrics";
import { STATUS_LABELS } from "@/lib/crm-status";
import { fmtMoney } from "./format";

const EMPTY = { count: 0, value: 0 } as const;

// Etapas abiertas del embudo en orden. won/lost se muestran aparte (resultados).
const STAGE_ORDER = ["new", "contacted", "following_up", "proposal"] as const;

export function Funnel({ funnel }: { funnel: DashboardMetrics["funnel"] }) {
  const reduce = useReducedMotion();
  const map = new Map(funnel.map((f) => [f.status, f]));

  const stages = STAGE_ORDER.map((s) => map.get(s)).filter(Boolean) as DashboardMetrics["funnel"];
  const won = map.get("won") ?? { status: "won" as const, ...EMPTY };
  const lost = map.get("lost") ?? { status: "lost" as const, ...EMPTY };

  const maxCount = Math.max(1, ...stages.map((s) => s.count), won.count, lost.count);
  const openTotal = stages.reduce((a, s) => a + s.count, 0);
  const totalIn = openTotal + won.count + lost.count;

  return (
    <div className="crm-card flex h-full flex-col p-5">
      <div>
        <h2 className="crm-h2">Embudo por etapa</h2>
        <p className="mt-1 text-[12px]" style={{ color: "var(--crm-ink-mute)" }}>
          Leads creados en el periodo, por su etapa actual
        </p>
      </div>

      {totalIn === 0 ? (
        <p className="mt-6 text-[13px]" style={{ color: "var(--crm-ink-mute)" }}>
          Sin datos en este periodo.
        </p>
      ) : (
        <>
          <div className="mt-5 space-y-2">
            {stages.map((s, i) => (
              <Segment
                key={s.status}
                label={STATUS_LABELS[s.status]}
                count={s.count}
                value={s.value}
                pct={openTotal > 0 ? Math.round((s.count / openTotal) * 100) : 0}
                width={(s.count / maxCount) * 100}
                delay={i * 0.07}
                reduce={!!reduce}
              />
            ))}
          </div>

          <div className="my-4 h-px" style={{ background: "var(--crm-line)" }} />

          <div className="grid grid-cols-2 gap-2">
            <Result label={STATUS_LABELS.won} count={won.count} value={won.value} tone="won" />
            <Result label={STATUS_LABELS.lost} count={lost.count} value={lost.value} tone="lost" />
          </div>
        </>
      )}
    </div>
  );
}

// Segmento centrado: el ancho proporcional al máximo dibuja la silueta de embudo.
function Segment({
  label,
  count,
  value,
  pct,
  width,
  delay,
  reduce,
}: {
  label: string;
  count: number;
  value: number;
  pct: number;
  width: number;
  delay: number;
  reduce: boolean;
}) {
  return (
    <div className="group" title={`${label}: ${count}${value > 0 ? ` · ${fmtMoney(value)}` : ""}`}>
      <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
        <span className="font-medium" style={{ color: "var(--crm-ink-soft)" }}>
          {label}
        </span>
        <span className="crm-num flex items-baseline gap-1.5">
          <span className="font-medium" style={{ color: "var(--crm-ink)" }}>
            {count}
          </span>
          <span style={{ color: "var(--crm-ink-mute)" }}>{pct}%</span>
        </span>
      </div>
      <div className="mt-1.5 flex justify-center">
        <motion.div
          className="flex h-8 items-center justify-center rounded-md"
          style={{
            background: "var(--crm-accent-tint)",
            border: "1px solid var(--crm-accent-ring)",
            width: `${count === 0 ? 6 : Math.max(14, width)}%`,
          }}
          initial={{ scaleX: reduce ? 1 : 0.4, opacity: reduce ? 1 : 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
        >
          {value > 0 && (
            <span
              className="crm-num truncate px-2 text-[11.5px] font-semibold"
              style={{ color: "var(--crm-accent-strong)" }}
            >
              {fmtMoney(value)}
            </span>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function Result({
  label,
  count,
  value,
  tone,
}: {
  label: string;
  count: number;
  value: number;
  tone: "won" | "lost";
}) {
  const accent = tone === "won";
  return (
    <div
      className="rounded-[var(--crm-r-md)] p-3"
      style={{
        background: "var(--crm-surface)",
        border: "1px solid var(--crm-line)",
      }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="size-1.5 rounded-full"
          style={{ background: accent ? "var(--crm-accent)" : "var(--crm-ink-faint)" }}
        />
        <span className="text-[12px] font-medium" style={{ color: "var(--crm-ink-soft)" }}>
          {label}
        </span>
      </div>
      <p
        className="crm-num mt-2 text-[20px] font-semibold leading-none"
        style={{ color: "var(--crm-ink)" }}
      >
        {count}
      </p>
      <p className="crm-num mt-1.5 text-[12px]" style={{ color: "var(--crm-ink-mute)" }}>
        {value > 0 ? fmtMoney(value) : "Sin valor"}
      </p>
    </div>
  );
}
