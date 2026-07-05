"use client";

import { motion, useReducedMotion } from "motion/react";

export type BreakdownRow = { label: string; count: number };

// Barras horizontales reutilizables para fuente y servicio.
// Acento con disciplina: solo la fila líder lleva mint, el resto es neutro.
export function Breakdown({
  title,
  subtitle,
  rows,
  emptyCopy,
}: {
  title: string;
  subtitle: string;
  rows: BreakdownRow[];
  emptyCopy: string;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((a, r) => a + r.count, 0);

  return (
    <div className="crm-card flex h-full flex-col p-5">
      <div>
        <h2 className="crm-h2">{title}</h2>
        <p className="mt-1 text-[12px]" style={{ color: "var(--crm-ink-mute)" }}>
          {subtitle}
        </p>
      </div>

      {total === 0 ? (
        <p className="mt-6 text-[13px]" style={{ color: "var(--crm-ink-mute)" }}>
          {emptyCopy}
        </p>
      ) : (
        <>
          <ul className="mt-5 space-y-3.5">
            {rows.map((r, i) => {
              const lead = r.count === max;
              const pct = Math.round((r.count / total) * 100);
              return (
                <li key={r.label} className="group" title={`${r.label}: ${r.count} (${pct}%)`}>
                  <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                    <span
                      className="truncate font-medium"
                      style={{ color: lead ? "var(--crm-ink)" : "var(--crm-ink-soft)" }}
                    >
                      {r.label}
                    </span>
                    <span className="crm-num shrink-0" style={{ color: "var(--crm-ink-soft)" }}>
                      {r.count}
                      <span className="ml-1.5" style={{ color: "var(--crm-ink-mute)" }}>
                        {pct}%
                      </span>
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                    style={{ background: "var(--crm-surface)" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: lead ? "var(--crm-accent)" : "var(--crm-line-strong)",
                        width: `${Math.max(4, (r.count / max) * 100)}%`,
                        transformOrigin: "left center",
                      }}
                      initial={{ scaleX: reduce ? 1 : 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.65, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <div
            className="mt-auto flex items-baseline justify-between gap-3 pt-4 text-[12px]"
            style={{ borderTop: "1px solid var(--crm-line)" }}
          >
            <span style={{ color: "var(--crm-ink-mute)" }}>Total</span>
            <span className="crm-num font-medium" style={{ color: "var(--crm-ink)" }}>
              {total}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
