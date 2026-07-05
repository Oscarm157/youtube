import type { ReactNode } from "react";

/**
 * Strip horizontal de datos clave del record (familia de layout propia, no card).
 * Celdas divididas por hairline vía gap-px sobre fondo line. Llena el ancho que
 * antes desperdiciaban las cards apiladas: el record "de un vistazo".
 */
export function KeyFacts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <div className="crm-fade overflow-hidden rounded-[var(--crm-r-lg)] border border-[var(--crm-line)]">
      <dl className="grid grid-cols-2 gap-px bg-[var(--crm-line)] sm:grid-cols-3 lg:grid-cols-6">
        {items.map((it, i) => (
          <div key={i} className="bg-[var(--crm-surface)] px-4 py-3">
            <dt className="crm-eyebrow mb-1.5 text-[10px]">{it.label}</dt>
            <dd className="flex min-h-[20px] items-center text-[13.5px] font-medium text-[var(--crm-ink)]">
              {it.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
