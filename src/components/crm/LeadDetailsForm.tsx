"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, Pencil } from "lucide-react";
import { visibleServices } from "@/lib/services";
import type { LeadQualification, LeadSource } from "@/lib/schema";

const SERVICE_NAMES = visibleServices.map((s) => s.name);

type Values = {
  name: string | null;
  email: string | null;
  phone: string | null;
  locale: string | null;
  source: LeadSource;
  summary: string | null;
  qualification: LeadQualification | null;
  valueAmount: number | null;
};

const QUAL_FIELDS: { key: keyof LeadQualification; label: string }[] = [
  { key: "service", label: "Servicio" },
  { key: "company", label: "Empresa" },
  { key: "industry", label: "Sector" },
  { key: "monthlyVolume", label: "Volumen mensual" },
  { key: "paymentTerms", label: "Tipo de operación" },
  { key: "timeInBusiness", label: "Antigüedad operando" },
  { key: "urgency", label: "Urgencia" },
];

const inputCls = "crm-input h-auto py-2 text-[14px]";
const labelCls = "mb-1 block text-[12.5px] font-medium text-[var(--crm-ink-soft)]";
const legendCls = "crm-eyebrow mb-2.5";

const LOCALE_LABEL: Record<string, string> = { en: "Inglés", es: "Español" };
const SOURCE_LABEL: Record<LeadSource, string> = { bot: "Chatbot", form: "Formulario", manual: "Manual" };

const usd = new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="crm-btn crm-btn-primary crm-btn-sm">
      {pending ? <Loader2 className="size-3.5 animate-spin" strokeWidth={2} /> : <Check className="size-3.5" strokeWidth={2} />}
      {pending ? "Guardando…" : "Guardar"}
    </button>
  );
}

function Prop({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  const has = value != null && value.trim() !== "";
  return (
    <div className="flex gap-3 py-2.5">
      <dt className="w-[104px] shrink-0 text-[13px] text-[var(--crm-ink-mute)]">{label}</dt>
      <dd className={`min-w-0 flex-1 break-words text-[13.5px] font-medium ${mono ? "crm-num " : ""}${has ? "text-[var(--crm-ink)]" : "text-[var(--crm-ink-faint)]"}`}>
        {has ? value : "Sin definir"}
      </dd>
    </div>
  );
}

export function LeadDetailsForm({
  action,
  lead,
  editable = true,
}: {
  action: (formData: FormData) => Promise<void>;
  lead: Values;
  editable?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const q = lead.qualification ?? {};

  if (!editing) {
    return (
      <div>
        {editable && (
          <div className="mb-3 flex justify-end">
            <button onClick={() => setEditing(true)} className="crm-btn crm-btn-ghost crm-btn-sm">
              <Pencil className="size-3.5" strokeWidth={2} />
              Editar
            </button>
          </div>
        )}
        <p className={legendCls}>Contacto</p>
        <dl className="divide-y divide-[var(--crm-line)]">
          <Prop label="Nombre" value={lead.name} />
          <Prop label="Correo" value={lead.email} />
          <Prop label="Teléfono" value={lead.phone} mono />
          <Prop label="Idioma" value={lead.locale ? LOCALE_LABEL[lead.locale] ?? lead.locale : null} />
          <Prop label="Origen" value={SOURCE_LABEL[lead.source]} />
          <Prop label="Valor estimado" value={lead.valueAmount != null ? usd.format(lead.valueAmount) : null} mono />
        </dl>

        <p className={`${legendCls} mt-5`}>Calificación</p>
        <dl className="divide-y divide-[var(--crm-line)]">
          {QUAL_FIELDS.map((f) => (
            <Prop key={f.key} label={f.label} value={q[f.key] ?? null} />
          ))}
        </dl>
      </div>
    );
  }

  return (
    <form action={async (fd) => { await action(fd); setEditing(false); }} className="flex flex-col">
      <div className="crm-scroll max-h-[56vh] space-y-5 overflow-y-auto pr-3">
      <fieldset className="space-y-3">
        <legend className={legendCls}>Contacto</legend>
        <div>
          <label className={labelCls} htmlFor="ld-name">Nombre</label>
          <input id="ld-name" name="name" defaultValue={lead.name ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="ld-email">Correo</label>
          <input id="ld-email" name="email" type="email" defaultValue={lead.email ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="ld-phone">Teléfono</label>
          <input id="ld-phone" name="phone" defaultValue={lead.phone ?? ""} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="ld-locale">Idioma</label>
            <select id="ld-locale" name="locale" defaultValue={lead.locale ?? "en"} className={inputCls}>
              <option value="en">Inglés</option>
              <option value="es">Español</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="ld-source">Origen</label>
            <select id="ld-source" name="source" defaultValue={lead.source} className={inputCls}>
              <option value="bot">Chatbot</option>
              <option value="form">Formulario</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="ld-value">Valor estimado (USD)</label>
          <input
            id="ld-value"
            name="valueAmount"
            inputMode="numeric"
            defaultValue={lead.valueAmount != null ? String(lead.valueAmount) : ""}
            placeholder="$ 0"
            className={`${inputCls} tabular-nums`}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={legendCls}>Calificación</legend>
        {QUAL_FIELDS.map((f) => {
          if (f.key === "service") {
            const current = q.service ?? "";
            const extra = current && !SERVICE_NAMES.includes(current) && current !== "Not sure" && current !== "No estoy seguro" ? [current] : [];
            return (
              <div key={f.key}>
                <label className={labelCls} htmlFor="ld-service">{f.label}</label>
                <select id="ld-service" name="service" defaultValue={current} className={inputCls}>
                  <option value="">Sin definir</option>
                  {SERVICE_NAMES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                  {extra.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                  <option value="Not sure">No estoy seguro</option>
                </select>
              </div>
            );
          }
          return (
            <div key={f.key}>
              <label className={labelCls} htmlFor={`ld-${f.key}`}>{f.label}</label>
              <input id={`ld-${f.key}`} name={f.key} defaultValue={q[f.key] ?? ""} className={inputCls} />
            </div>
          );
        })}
      </fieldset>

      <fieldset>
        <legend className={legendCls}>Resumen</legend>
        <textarea name="summary" rows={4} defaultValue={lead.summary ?? ""} className={`${inputCls} resize-y leading-relaxed`} placeholder="Resumen breve de la situación del lead." />
      </fieldset>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-[var(--crm-line)] pt-4">
        <button type="button" onClick={() => setEditing(false)} className="crm-btn crm-btn-secondary crm-btn-sm">Cancelar</button>
        <SaveButton />
      </div>
    </form>
  );
}
