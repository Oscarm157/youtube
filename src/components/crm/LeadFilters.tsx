"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Select } from "@/components/crm/ui/Select";

type Owner = { id: string; name: string };

// "all" = centinela (Radix Select no admite value vacío); se mapea a "" al setear el filtro.
const SOURCES = [
  { value: "all", label: "Todos los orígenes" },
  { value: "bot", label: "Chatbot" },
  { value: "form", label: "Formulario" },
  { value: "manual", label: "Manual" },
];

const SORTS = [
  { value: "recent", label: "Más recientes" },
  { value: "name", label: "Nombre A–Z" },
  { value: "status", label: "Etapa del pipeline" },
];

export function LeadFilters({
  owners,
  showOwner,
  showUnassigned,
}: {
  owners: Owner[];
  showOwner: boolean;
  showUnassigned: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(params.get("search") ?? "");
  const [advanced, setAdvanced] = useState(
    Boolean(params.get("owner") || params.get("source") || params.get("sort"))
  );
  const firstRender = useRef(true);

  const owner = params.get("owner") ?? "";
  const source = params.get("source") ?? "";
  const sort = params.get("sort") ?? "recent";
  const unassigned = params.get("unassigned") === "1";

  // Push a single param change while preserving the rest; reset page to 1.
  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    startTransition(() => {
      const qs = next.toString();
      router.replace(qs ? `/admin?${qs}` : "/admin", { scroll: false });
    });
  }

  // Debounce the search box into the URL.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      if ((params.get("search") ?? "") !== search) setParam("search", search);
    }, 320);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const ownerOptions = [
    { value: "all", label: "Todos los responsables" },
    ...owners.map((o) => ({ value: o.id, label: o.name })),
  ];

  return (
    <div className="mt-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="group relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--crm-ink-mute)] transition-colors group-focus-within:text-[var(--crm-accent-strong)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nombre, correo, teléfono, empresa…"
            className="crm-input h-10 !pl-10 !pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--crm-ink-mute)] transition-colors hover:bg-[var(--crm-surface-2)] hover:text-[var(--crm-ink)]"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {showUnassigned && (
          <button
            onClick={() => setParam("unassigned", unassigned ? "" : "1")}
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors ${
              unassigned
                ? "border-[var(--crm-accent-ring)] bg-[var(--crm-accent-tint)] text-[var(--crm-accent-strong)]"
                : "border-[var(--crm-line-strong)] bg-[var(--crm-surface)] text-[var(--crm-ink-soft)] hover:border-[var(--crm-ink-mute)] hover:text-[var(--crm-ink)]"
            }`}
          >
            <span className={`size-1.5 rounded-full ${unassigned ? "bg-[var(--crm-accent)]" : "bg-[var(--crm-ink-mute)]"}`} />
            Sin asignar
          </button>
        )}

        <button
          onClick={() => setAdvanced((v) => !v)}
          className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors ${
            advanced
              ? "border-[var(--crm-ink-mute)] bg-[var(--crm-surface-2)] text-[var(--crm-ink)]"
              : "border-[var(--crm-line-strong)] bg-[var(--crm-surface)] text-[var(--crm-ink-soft)] hover:border-[var(--crm-ink-mute)] hover:text-[var(--crm-ink)]"
          }`}
        >
          <SlidersHorizontal className="size-3.5" />
          Filtros
        </button>
      </div>

      {advanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="grid grid-cols-2 gap-2 pt-0.5 sm:grid-cols-3">
            {showOwner && (
              <Select
                ariaLabel="Responsable"
                value={owner || "all"}
                options={ownerOptions}
                onValueChange={(v) => setParam("owner", v === "all" ? "" : v)}
              />
            )}
            <Select
              ariaLabel="Origen"
              value={source || "all"}
              options={SOURCES}
              onValueChange={(v) => setParam("source", v === "all" ? "" : v)}
            />
            <Select
              ariaLabel="Orden"
              value={sort}
              options={SORTS}
              onValueChange={(v) => setParam("sort", v === "recent" ? "" : v)}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
