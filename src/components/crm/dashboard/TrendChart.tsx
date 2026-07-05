"use client";

import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { DashboardMetrics } from "@/lib/crm-metrics";

const W = 640;
const H = 280;
const PAD = { top: 16, right: 16, bottom: 30, left: 34 };

function fmtWeek(period: string): string {
  // period = 'YYYY-MM-DD' (Monday). Muestra "12 may".
  const d = new Date(`${period}T00:00:00`);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function TrendChart({ trend }: { trend: DashboardMetrics["trend"] }) {
  const reduce = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (trend.length < 2) return null;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    const rawMax = Math.max(1, ...trend.map((t) => t.count));
    const step = Math.max(1, Math.ceil(rawMax / 4));
    const yMax = Math.ceil(rawMax / step) * step;
    const yTicks: number[] = [];
    for (let v = 0; v <= yMax; v += step) yTicks.push(v);

    const x = (i: number) => PAD.left + (innerW * i) / (trend.length - 1);
    const y = (v: number) => PAD.top + innerH - (innerH * v) / yMax;

    const pts = trend.map((t, i) => ({ x: x(i), y: y(t.count), ...t }));
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const baseY = PAD.top + innerH;
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${baseY} L${pts[0].x.toFixed(1)},${baseY} Z`;

    return { pts, line, area, baseY, innerW, yMax, yTicks, x: (i: number) => x(i), yFn: y };
  }, [trend]);

  function onMove(e: React.MouseEvent) {
    if (!geo || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xView = ((e.clientX - rect.left) / rect.width) * W;
    const idx = clamp(Math.round(((xView - PAD.left) / geo.innerW) * (trend.length - 1)), 0, trend.length - 1);
    setHover(idx);
  }

  const active = hover != null && geo ? geo.pts[hover] : null;
  const total = trend.reduce((s, t) => s + t.count, 0);
  const lastIdx = trend.length - 1;

  return (
    <div className="crm-card flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="crm-h2">Tendencia de leads</h2>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className="crm-num font-semibold text-[32px] leading-none tracking-[-0.025em]"
              style={{ color: "var(--crm-ink)" }}
            >
              {total}
            </span>
            <span className="text-[12px]" style={{ color: "var(--crm-ink-mute)" }}>
              nuevos leads, por semana
            </span>
          </div>
        </div>
      </div>

      {!geo ? (
        <p className="mt-6 text-[13px]" style={{ color: "var(--crm-ink-mute)" }}>
          {trend.length === 0
            ? "Sin datos en este periodo."
            : "Se necesitan al menos dos semanas con datos para trazar la tendencia."}
        </p>
      ) : (
        <div className="relative mt-5 flex-1">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full"
            role="img"
            aria-label="Tendencia de leads por semana"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id="crm-trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--crm-wine)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--crm-wine)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Y gridlines + labels */}
            {geo.yTicks.map((v) => {
              const yy = geo.yFn(v);
              return (
                <g key={v}>
                  <line x1={PAD.left} y1={yy} x2={W - PAD.right} y2={yy} stroke="var(--crm-line)" strokeWidth="1" strokeDasharray={v === 0 ? "0" : "3 4"} />
                  <text x={PAD.left - 8} y={yy + 3} textAnchor="end" fontSize="10" fill="var(--crm-ink-mute)">
                    {v}
                  </text>
                </g>
              );
            })}

            {/* area + line */}
            <motion.path d={geo.area} fill="url(#crm-trend-fill)" initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }} />
            <motion.path
              d={geo.line}
              fill="none"
              stroke="var(--crm-wine)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              initial={{ pathLength: reduce ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* crosshair on hover */}
            {active && (
              <line x1={active.x} y1={PAD.top} x2={active.x} y2={geo.baseY} stroke="var(--crm-wine)" strokeWidth="1" strokeOpacity="0.35" />
            )}

            {/* marcador del punto actual (último) + punto en hover; el resto limpio */}
            {geo.pts.map((p, i) => {
              const isHover = hover === i;
              const isLast = i === lastIdx;
              if (!isHover && !isLast) return null;
              return (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={isHover ? 5 : 3.5}
                  fill={isHover ? "var(--crm-wine)" : "var(--crm-surface)"}
                  stroke="var(--crm-wine)"
                  strokeWidth="1.8"
                />
              );
            })}

            {/* X labels */}
            {geo.pts.filter((_, i) => i % Math.ceil(trend.length / 5) === 0 || i === trend.length - 1).map((t, i) => (
              <text key={i} x={t.x} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--crm-ink-mute)">
                {fmtWeek(t.period)}
              </text>
            ))}
          </svg>

          {/* tooltip anclado, con clamp para no salirse por los bordes */}
          {active && (
            <div
              className="pointer-events-none absolute z-10 rounded-[var(--crm-r-md)] border px-2.5 py-1.5 text-center"
              style={{
                left: `${clamp((active.x / W) * 100, 12, 88)}%`,
                top: `${(active.y / H) * 100}%`,
                transform: "translate(-50%, -100%)",
                marginTop: "-12px",
                background: "var(--crm-surface-3)",
                borderColor: "var(--crm-line-strong)",
                boxShadow: "var(--crm-shadow-pop)",
              }}
            >
              <p className="text-[11.5px] font-medium" style={{ color: "var(--crm-ink-mute)" }}>
                Semana del {fmtWeek(active.period)}
              </p>
              <p
                className="crm-num font-semibold text-[16px] leading-tight"
                style={{ color: "var(--crm-accent-strong)" }}
              >
                {active.count} {active.count === 1 ? "lead" : "leads"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
