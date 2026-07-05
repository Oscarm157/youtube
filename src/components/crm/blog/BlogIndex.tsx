"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

type Status = "draft" | "scheduled" | "published";

export type BlogRow = {
  id: string;
  titleEs: string;
  titleEn: string;
  excerptEs: string | null;
  category: string | null;
  status: Status;
  featured: boolean;
  coverUrl: string | null;
  sourceName: string | null;
  updatedLabel: string;
};

const STATUS_META: Record<Status, { label: string; cls: string; dot: string }> = {
  draft: {
    label: "Borrador",
    cls: "border-[var(--crm-line-strong)] bg-[var(--crm-surface-2)] text-[var(--crm-ink-mute)]",
    dot: "bg-[var(--crm-ink-faint)]",
  },
  scheduled: {
    label: "Programada",
    cls: "border-amber-400/25 bg-amber-400/12 text-amber-300",
    dot: "bg-amber-400",
  },
  published: {
    label: "Publicada",
    cls: "border-[var(--crm-accent-ring)] bg-[var(--crm-accent-tint)] text-[var(--crm-accent-strong)]",
    dot: "bg-[var(--crm-accent)]",
  },
};

function StatusPill({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${m.cls}`}
    >
      <span className={`size-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function Thumb({ url, title }: { url: string | null; title: string }) {
  if (url) {
    return (
      <span className="block size-12 shrink-0 overflow-hidden rounded-[var(--crm-r-sm)] border border-[var(--crm-line)] bg-[var(--crm-surface-2)] sm:size-[52px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      title={title}
      className="grid size-12 shrink-0 place-items-center rounded-[var(--crm-r-sm)] border border-[var(--crm-line)] bg-[var(--crm-surface-2)] text-[var(--crm-ink-faint)] sm:size-[52px]"
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-5">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" />
        <path d="m4 17 4.5-4.5L13 17l3-3 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

type TabKey = "all" | "published" | "scheduled" | "draft";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "published", label: "Publicadas" },
  { key: "scheduled", label: "Programadas" },
  { key: "draft", label: "Borradores" },
];

export function BlogIndex({ articles }: { articles: BlogRow[] }) {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: articles.length,
      published: articles.filter((a) => a.status === "published").length,
      scheduled: articles.filter((a) => a.status === "scheduled").length,
      draft: articles.filter((a) => a.status === "draft").length,
    }),
    [articles],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (tab !== "all" && a.status !== tab) return false;
      if (!q) return true;
      return a.titleEs.toLowerCase().includes(q) || a.titleEn.toLowerCase().includes(q);
    });
  }, [articles, tab, query]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        {/* Filtro de estado */}
        <div className="flex flex-wrap items-center gap-0.5 self-start rounded-[var(--crm-r-md)] border border-[var(--crm-line)] bg-[var(--crm-surface-2)] p-0.5">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={active}
                className={`relative inline-flex items-center gap-1.5 rounded-[calc(var(--crm-r-md)-2px)] px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "text-[var(--crm-ink)]"
                    : "text-[var(--crm-ink-mute)] hover:text-[var(--crm-ink-soft)]"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="blog-tab-bg"
                    className="absolute inset-0 rounded-[calc(var(--crm-r-md)-2px)] border border-[var(--crm-line-strong)] bg-[var(--crm-surface-3)]"
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 36 }}
                  />
                )}
                <span className="relative z-10">{t.label}</span>
                <span
                  className={`crm-num relative z-10 rounded-full px-1.5 text-[11px] tabular-nums ${
                    active
                      ? "bg-[var(--crm-surface)] text-[var(--crm-ink-soft)]"
                      : "text-[var(--crm-ink-faint)]"
                  }`}
                >
                  {counts[t.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Búsqueda + CTA */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-72 lg:flex-none">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--crm-ink-faint)]"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título"
              className="crm-input w-full pl-[2.1rem]"
            />
          </div>
          <Link href="/admin/blog/new" className="crm-btn crm-btn-primary whitespace-nowrap">
            Nueva nota
          </Link>
        </div>
      </div>

      <div className="crm-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--crm-line)] px-4 py-2.5">
          <span className="text-[12.5px] text-[var(--crm-ink-mute)]">
            <span className="crm-num font-medium text-[var(--crm-ink-soft)]">{rows.length}</span>{" "}
            {rows.length === 1 ? "nota" : "notas"}
            {query.trim() && <span className="text-[var(--crm-ink-faint)]"> para “{query.trim()}”</span>}
          </span>
          <span className="text-[12.5px] text-[var(--crm-ink-mute)]">
            <span className="crm-num font-medium text-[var(--crm-accent-strong)]">{counts.published}</span>{" "}
            publicadas
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="crm-empty px-6 py-16">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden className="mb-3 size-7 text-[var(--crm-ink-faint)]">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-[14px] font-medium text-[var(--crm-ink)]">Sin coincidencias</p>
            <p className="mt-1 max-w-xs text-[13px] text-[var(--crm-ink-mute)]">
              Ajusta el estado o cambia los términos de búsqueda.
            </p>
          </div>
        ) : (
          <ul>
            {rows.map((a, i) => (
              <li
                key={a.id}
                className="crm-fade border-b border-[var(--crm-line)] last:border-b-0"
                style={{ animationDelay: `${Math.min(i, 14) * 22}ms` }}
              >
                <Link
                  href={`/admin/blog/${a.id}`}
                  className="group flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-[var(--crm-surface-2)] sm:gap-4"
                >
                  <Thumb url={a.coverUrl} title={a.titleEs} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {a.featured && (
                        <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 shrink-0 text-[var(--crm-accent)]">
                          <path
                            d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8-4.3-4.1 5.9-.9L12 3Z"
                            fill="currentColor"
                          />
                        </svg>
                      )}
                      <h3 className="truncate text-[14px] font-semibold text-[var(--crm-ink)] transition-colors group-hover:text-[var(--crm-accent-strong)]">
                        {a.titleEs}
                      </h3>
                    </div>
                    {a.excerptEs && (
                      <p className="mt-0.5 truncate text-[12.5px] text-[var(--crm-ink-mute)]">{a.excerptEs}</p>
                    )}
                  </div>

                  <div className="hidden w-28 shrink-0 md:block">
                    {a.category ? (
                      <span className="crm-badge">{a.category}</span>
                    ) : (
                      <span className="text-[12.5px] text-[var(--crm-ink-faint)]">Sin categoría</span>
                    )}
                  </div>

                  <div className="hidden w-32 shrink-0 flex-col items-end gap-0.5 text-right lg:flex">
                    <span className="crm-num text-[12.5px] text-[var(--crm-ink-soft)]">{a.updatedLabel}</span>
                    {a.sourceName && (
                      <span className="max-w-full truncate text-[11.5px] text-[var(--crm-ink-faint)]">
                        {a.sourceName}
                      </span>
                    )}
                  </div>

                  <div className="shrink-0">
                    <StatusPill status={a.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
