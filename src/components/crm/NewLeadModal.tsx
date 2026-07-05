"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { createLead } from "@/app/admin/actions";
import { Modal } from "./Modal";

const labelCls = "mb-1 block text-[12.5px] font-medium text-[var(--crm-ink)]";

function CreateButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="crm-btn crm-btn-primary w-full">
      {pending ? "Creando…" : "Crear lead"}
    </button>
  );
}

export function NewLeadModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const valid = name.trim() !== "" && (email.trim() !== "" || phone.trim() !== "");

  return (
    <>
      <button onClick={() => setOpen(true)} className="crm-btn crm-btn-primary">
        <Plus className="size-[15px]" strokeWidth={2.1} />
        Nuevo lead
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo lead" maxWidth={400}>
        <form action={createLead} className="space-y-3.5">
          <div>
            <label className={labelCls} htmlFor="nl-name">Nombre</label>
            <input id="nl-name" name="name" value={name} onChange={(e) => setName(e.target.value)} className="crm-input" placeholder="Nombre completo" />
          </div>
          <div>
            <label className={labelCls} htmlFor="nl-email">Correo</label>
            <input id="nl-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="crm-input" placeholder="nombre@empresa.com" />
          </div>
          <div>
            <label className={labelCls} htmlFor="nl-phone">Teléfono</label>
            <input id="nl-phone" name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="crm-input" placeholder="+52 664 000 0000" />
          </div>
          <p className="text-[12.5px] text-[var(--crm-ink-mute)]">Nombre y al menos un dato de contacto.</p>
          <CreateButton disabled={!valid} />
        </form>
      </Modal>
    </>
  );
}
