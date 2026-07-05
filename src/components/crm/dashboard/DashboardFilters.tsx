"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Select } from "@/components/crm/ui/Select";

type Agent = { id: string; name: string };

const RANGES = [
  { value: "month", label: "Este mes" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
  { value: "year", label: "Año" },
  { value: "all", label: "Todo" },
] as const;

// "all" = centinela (Radix Select no admite value vacío); se mapea a "" al setear.
const SOURCES = [
  { value: "all", label: "Todas las fuentes" },
  { value: "bot", label: "Chatbot" },
  { value: "form", label: "Formulario" },
  { value: "manual", label: "Manual" },
];

export function DashboardFilters({
  agents,
  showAgent,
}: {
  agents: Agent[];
  showAgent: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const range = params.get("range") ?? "30d";
  const owner = params.get("owner") ?? "";
  const source = params.get("source") ?? "";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => {
      const qs = next.toString();
      router.replace(qs ? `/admin/dashboard?${qs}` : "/admin/dashboard", { scroll: false });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2" data-pending={pending ? "" : undefined}>
      {/* segmented control de rango */}
      <div
        className="inline-flex rounded-lg p-0.5"
        style={{ background: "var(--crm-surface-2)", border: "1px solid var(--crm-line)" }}
      >
        {RANGES.map((r) => {
          const on = r.value === range;
          return (
            <button
              key={r.value}
              onClick={() => setParam("range", r.value === "30d" ? "" : r.value)}
              className="relative h-8 rounded-md px-3 text-[12.5px] font-medium transition-colors"
              style={{ color: on ? "var(--crm-on-accent)" : "var(--crm-ink-soft)" }}
            >
              {on && (
                <motion.span
                  layoutId="crm-range-pill"
                  className="absolute inset-0 rounded-md"
                  style={{ background: "var(--crm-accent)" }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10">{r.label}</span>
            </button>
          );
        })}
      </div>

      {showAgent && (
        <div className="w-[170px]">
          <Select
            ariaLabel="Agente"
            size="sm"
            value={owner || "all"}
            onValueChange={(v) => setParam("owner", v === "all" ? "" : v)}
            options={[{ value: "all", label: "Todos los agentes" }, ...agents.map((a) => ({ value: a.id, label: a.name }))]}
          />
        </div>
      )}

      <div className="w-[160px]">
        <Select
          ariaLabel="Origen"
          size="sm"
          value={source || "all"}
          onValueChange={(v) => setParam("source", v === "all" ? "" : v)}
          options={SOURCES}
        />
      </div>
    </div>
  );
}
