"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteLead } from "@/app/admin/actions";

export function DeleteLeadButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("¿Eliminar este lead? Esto borra de forma permanente sus notas, archivos y actividad.")) {
          startTransition(() => deleteLead(id));
        }
      }}
      title="Eliminar lead"
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--crm-line)] bg-[var(--crm-surface-2)] px-2.5 py-2 text-[13px] font-medium text-[var(--crm-ink-soft)] transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" strokeWidth={2} /> : <Trash2 className="size-3.5" strokeWidth={1.8} />}
      Eliminar
    </button>
  );
}
