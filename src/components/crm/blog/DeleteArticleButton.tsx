"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/crm/Modal";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="crm-btn crm-btn-sm border border-[var(--destructive)]/40 bg-[var(--destructive)]/12 text-[var(--destructive)] hover:bg-[var(--destructive)]/20"
    >
      {pending ? "Borrando…" : "Borrar nota"}
    </button>
  );
}

export function DeleteArticleButton({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="crm-btn crm-btn-ghost crm-btn-sm text-[var(--destructive)] hover:bg-[rgba(240,80,63,0.1)] hover:text-[var(--destructive)]"
      >
        <Trash2 className="size-[14px]" strokeWidth={2} />
        Borrar
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Borrar esta nota" maxWidth={420}>
        <p className="text-[13.5px] leading-relaxed text-[var(--crm-ink-soft)]">
          Se elimina la nota en español e inglés. No se puede deshacer.
        </p>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button type="button" onClick={() => setOpen(false)} className="crm-btn crm-btn-secondary crm-btn-sm">
            Cancelar
          </button>
          <form action={action}>
            <ConfirmButton />
          </form>
        </div>
      </Modal>
    </>
  );
}
