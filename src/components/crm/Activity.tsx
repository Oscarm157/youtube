"use client";

import { motion, useReducedMotion } from "motion/react";
import { Plus, Pencil, Flag, UserCheck, MessageSquare, Paperclip, Circle } from "lucide-react";
import { fmtDate } from "@/lib/crm-format";

const timeFmt = new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" });
function fmtTime(raw: Date | string | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "" : timeFmt.format(d);
}

type Event = {
  id: string;
  kind: string;
  detail: string;
  createdAt: Date | string | null;
  authorName: string | null;
};

const META: Record<string, { icon: typeof Plus; cls: string }> = {
  created: { icon: Plus, cls: "bg-emerald-600/12 text-emerald-300" },
  edit: { icon: Pencil, cls: "bg-blue-500/12 text-blue-300" },
  status: { icon: Flag, cls: "bg-amber-500/15 text-amber-300" },
  assign: { icon: UserCheck, cls: "bg-indigo-500/12 text-indigo-300" },
  note: { icon: MessageSquare, cls: "bg-[var(--crm-accent-tint)] text-[var(--crm-accent-strong)]" },
  file: { icon: Paperclip, cls: "bg-teal-500/12 text-teal-300" },
};

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(raw: Date | string | null): string {
  if (!raw) return "Sin fecha";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "Sin fecha";
  const now = new Date();
  if (dayKey(d) === dayKey(now)) return "Hoy";
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(yest)) return "Ayer";
  return fmtDate(d);
}

export function Activity({ events }: { events: Event[] }) {
  const reduce = useReducedMotion();

  if (events.length === 0) {
    return <p className="text-[13.5px] text-[var(--crm-ink-mute)]">Aún no hay actividad.</p>;
  }

  return (
    <ul className="relative">
      {/* rail vertical continuo */}
      <span className="absolute bottom-3 left-[11px] top-3 w-px bg-[var(--crm-line)]" aria-hidden />
      {events.map((e, i) => {
        const m = META[e.kind] ?? { icon: Circle, cls: "bg-[var(--crm-surface-3)] text-[var(--crm-ink-mute)]" };
        const Icon = m.icon;
        const label = dayLabel(e.createdAt);
        const showDay = i === 0 || dayLabel(events[i - 1].createdAt) !== label;
        return (
          <motion.li
            key={e.id}
            initial={reduce ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: Math.min(i * 0.035, 0.3), ease: "easeOut" }}
            className="relative flex gap-3 pb-4 last:pb-0"
          >
            <span
              className={`relative z-10 mt-px inline-flex size-6 shrink-0 items-center justify-center rounded-full ring-4 ring-[var(--crm-surface-2)] ${m.cls}`}
            >
              <Icon className="size-3" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              {showDay && (
                <p className="crm-eyebrow mb-1.5 text-[10px] text-[var(--crm-ink-faint)]">{label}</p>
              )}
              <p className="text-[13.5px] leading-snug text-[var(--crm-ink-soft)]">{e.detail}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--crm-ink-mute)]">
                <span className="font-medium text-[var(--crm-ink-soft)]">{e.authorName ?? "Sistema"}</span>
                <span className="text-[var(--crm-ink-faint)]">·</span>
                <span className="crm-num">{fmtTime(e.createdAt)}</span>
              </p>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
