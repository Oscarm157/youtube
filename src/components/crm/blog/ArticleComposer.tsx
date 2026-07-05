"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { draftArticle } from "@/app/admin/blog-actions";
import { CategoryCombobox } from "./CategoryCombobox";
import { CoverImageInput } from "./CoverImageInput";

interface Props {
  categories: string[];
}

const label = "mb-1.5 block text-[12.5px] font-medium text-[var(--crm-ink-soft)]";

// Entrada por texto pegado (siempre funciona, sin deps extra). Para sumar
// extracción desde URL o PDF, agrega una ruta /admin/blog/extract y pásale el
// texto resultante a `fd.set("source", ...)` antes de draftArticle.
export function ArticleComposer({ categories }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const params = useSearchParams();
  const serverError = params.get("error");

  const canGenerate = useMemo(() => text.trim().length > 30, [text]);

  const handler = async (fd: FormData) => {
    setLoading(true);
    fd.set("source", text);
    await draftArticle(fd);
  };

  return (
    <form action={handler}>
      <AnimatePresence>
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-5 flex items-start gap-3 rounded-[var(--crm-r-lg)] border border-[var(--crm-line-strong)] bg-[var(--crm-surface-2)] p-4"
          >
            <span aria-hidden className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#ef6f6f]" />
            <p className="text-[13px] leading-relaxed text-[var(--crm-ink-soft)]">
              {serverError === "empty"
                ? "La fuente no devolvió texto legible. Pega el contenido de la nota."
                : "No se pudo generar el borrador. Intenta de nuevo."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="crm-card flex flex-col p-5">
          <div className="mb-4 flex items-baseline gap-2.5">
            <span className="crm-eyebrow">Paso 1</span>
            <h2 className="crm-h2">Fuente</h2>
          </div>
          <label className="mb-2 flex items-center justify-between text-[13px] font-medium text-[var(--crm-ink-soft)]">
            <span>Texto fuente</span>
            <span className="crm-num text-[12px] text-[var(--crm-ink-mute)]">{text.length.toLocaleString()} caracteres</span>
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pega aquí el texto de la nota, comunicado o boletín…"
            rows={12}
            className="crm-textarea min-h-[260px] flex-1 resize-y"
          />
        </section>

        <section className="crm-card flex flex-col p-5">
          <div className="mb-4 flex items-baseline gap-2.5">
            <span className="crm-eyebrow">Paso 2</span>
            <h2 className="crm-h2">Dirección editorial</h2>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <span className={label}>Categoría</span>
              <CategoryCombobox categories={categories} />
            </div>

            <div>
              <label htmlFor="guidance" className={label}>Ángulo de la nota</label>
              <textarea
                id="guidance"
                name="guidance"
                rows={4}
                className="crm-textarea resize-y"
                placeholder="¿A quién va dirigida? ¿Qué enfatizar? Opcional."
              />
              <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--crm-ink-mute)]">
                Si lo dejas vacío, la IA redacta con el criterio editorial estándar.
              </p>
            </div>

            <div>
              <p className="crm-eyebrow mb-2.5">Atribución</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="sourceName" className={label}>Fuente</label>
                  <input id="sourceName" name="sourceName" className="crm-input" placeholder="Nombre del medio…" />
                </div>
                <div>
                  <label htmlFor="sourceUrl" className={label}>URL de la fuente</label>
                  <input id="sourceUrl" name="sourceUrl" type="url" className="crm-input" placeholder="https://…" />
                </div>
              </div>
            </div>

            <div>
              <span className={label}>Portada</span>
              <CoverImageInput />
            </div>
          </div>

          <div className="mt-6 pt-1">
            <button type="submit" disabled={!canGenerate || loading} className="crm-btn crm-btn-primary h-11 w-full">
              {loading ? (
                <>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="animate-spin"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" strokeOpacity="0.3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                  <span>Generando borrador…</span>
                </>
              ) : (
                <>
                  <span>Generar borrador</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </>
              )}
            </button>
            <p className="mt-2.5 text-center text-[12px] text-[var(--crm-ink-mute)]">
              Redacta en español e inglés y abre el editor.
            </p>
          </div>
        </section>
      </div>
    </form>
  );
}
