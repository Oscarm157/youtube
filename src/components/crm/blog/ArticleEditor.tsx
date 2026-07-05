"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, Pencil } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MarkdownPreview } from "./MarkdownPreview";
import { CategoryCombobox } from "./CategoryCombobox";
import { CoverImageInput } from "./CoverImageInput";

type Lang = "es" | "en";

type EditorArticle = {
  slug: string;
  category: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  coverUrl: string | null;
  coverPathname: string | null;
  featured: boolean;
  titleEs: string;
  excerptEs: string | null;
  bodyEs: string | null;
  recommendationsEs: string | null;
  titleEn: string;
  excerptEn: string | null;
  bodyEn: string | null;
  recommendationsEn: string | null;
};

const labelCls = "mb-1.5 block text-[12.5px] font-medium text-[var(--crm-ink-soft)]";
const metaLabel = "mb-1 block text-[11.5px] font-medium text-[var(--crm-ink-mute)]";

/** Campo Markdown con toggle Escribir / Vista. El textarea queda SIEMPRE montado
 *  (en Vista solo se oculta por CSS) para que su value viaje en el submit. */
function MarkdownField({
  name,
  label,
  defaultValue,
  rows,
  onValueChange,
}: {
  name: string;
  label: string;
  defaultValue: string;
  rows: number;
  onValueChange?: (v: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [mode, setMode] = useState<"write" | "preview">("write");

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label className="text-[12.5px] font-medium text-[var(--crm-ink-soft)]" htmlFor={name}>
          {label}
        </label>
        <div className="inline-flex items-center gap-0.5 rounded-[var(--crm-r-md)] border border-[var(--crm-line)] bg-[var(--crm-surface-2)] p-0.5">
          <button
            type="button"
            onClick={() => setMode("write")}
            aria-pressed={mode === "write"}
            className={`inline-flex items-center gap-1.5 rounded-[var(--crm-r-sm)] px-2 py-1 text-[12px] font-medium transition-colors ${
              mode === "write"
                ? "bg-[var(--crm-surface-3)] text-[var(--crm-ink)]"
                : "text-[var(--crm-ink-mute)] hover:text-[var(--crm-ink-soft)]"
            }`}
          >
            <Pencil className="size-3" strokeWidth={2} /> Escribir
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            aria-pressed={mode === "preview"}
            className={`inline-flex items-center gap-1.5 rounded-[var(--crm-r-sm)] px-2 py-1 text-[12px] font-medium transition-colors ${
              mode === "preview"
                ? "bg-[var(--crm-surface-3)] text-[var(--crm-ink)]"
                : "text-[var(--crm-ink-mute)] hover:text-[var(--crm-ink-soft)]"
            }`}
          >
            <Eye className="size-3" strokeWidth={2} /> Vista
          </button>
        </div>
      </div>

      <textarea
        id={name}
        name={name}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onValueChange?.(e.target.value);
        }}
        rows={rows}
        className={`crm-textarea font-mono text-[13px] leading-relaxed ${mode === "preview" ? "hidden" : ""}`}
      />

      {mode === "preview" && (
        <div
          className="crm-scroll overflow-y-auto rounded-[var(--crm-r-md)] border border-[var(--crm-line)] bg-[var(--crm-surface)] px-4 py-3.5"
          style={{ minHeight: `${rows * 1.6}rem` }}
        >
          <MarkdownPreview>{value}</MarkdownPreview>
        </div>
      )}
    </div>
  );
}

function LangPanel({
  prefix,
  title,
  excerpt,
  body,
  recommendations,
  titleLabel,
  excerptLabel,
  bodyLabel,
  recsLabel,
  titleRequired,
  onBodyChange,
}: {
  prefix: "Es" | "En";
  title: string;
  excerpt: string;
  body: string;
  recommendations: string;
  titleLabel: string;
  excerptLabel: string;
  bodyLabel: string;
  recsLabel: string;
  titleRequired?: boolean;
  onBodyChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={labelCls} htmlFor={`title${prefix}`}>{titleLabel}</label>
        <input id={`title${prefix}`} name={`title${prefix}`} defaultValue={title} required={titleRequired} className="crm-input" />
      </div>
      <div>
        <label className={labelCls} htmlFor={`excerpt${prefix}`}>{excerptLabel}</label>
        <input id={`excerpt${prefix}`} name={`excerpt${prefix}`} defaultValue={excerpt} className="crm-input" />
      </div>
      <MarkdownField name={`body${prefix}`} label={bodyLabel} defaultValue={body} rows={16} onValueChange={onBodyChange} />
      <MarkdownField name={`recommendations${prefix}`} label={recsLabel} defaultValue={recommendations} rows={7} />
    </div>
  );
}

function SaveBar({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--crm-line)] bg-[var(--crm-bg)]/90 px-4 py-3.5 backdrop-blur sm:-mx-7 sm:px-7">
      <button type="submit" disabled={pending} className="crm-btn crm-btn-primary disabled:opacity-70">
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
      <span className="text-[12px] text-[var(--crm-ink-mute)]">Los cambios no se publican hasta que uses Publicar.</span>
      <span className="crm-num ml-auto text-[12px] text-[var(--crm-ink-faint)]">{count.toLocaleString("es-MX")} caracteres</span>
    </div>
  );
}

export function ArticleEditor({
  action,
  article,
  categories,
}: {
  action: (formData: FormData) => Promise<void>;
  article: EditorArticle;
  categories: string[];
}) {
  const [lang, setLang] = useState<Lang>("es");
  const [bodyLen, setBodyLen] = useState({
    es: (article.bodyEs ?? "").length,
    en: (article.bodyEn ?? "").length,
  });

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Workspace de idioma */}
        <section className="crm-card p-6">
          <Tabs value={lang} onValueChange={(v) => setLang(v as Lang)} className="gap-0">
            <TabsList variant="line" className="h-auto w-full justify-start gap-5 rounded-none border-b border-[var(--crm-line)] px-0 pb-2.5">
              <TabsTrigger value="es" className="flex-none px-0 text-[13.5px]">Español</TabsTrigger>
              <TabsTrigger value="en" className="flex-none px-0 text-[13.5px]">English</TabsTrigger>
            </TabsList>

            <TabsContent value="es" forceMount className="pt-5 data-[state=inactive]:hidden">
              <LangPanel
                prefix="Es"
                title={article.titleEs}
                excerpt={article.excerptEs ?? ""}
                body={article.bodyEs ?? ""}
                recommendations={article.recommendationsEs ?? ""}
                titleLabel="Título"
                excerptLabel="Extracto"
                bodyLabel="Cuerpo (Markdown)"
                recsLabel="Recomendaciones de BG (Markdown)"
                titleRequired
                onBodyChange={(v) => setBodyLen((p) => ({ ...p, es: v.length }))}
              />
            </TabsContent>

            <TabsContent value="en" forceMount className="pt-5 data-[state=inactive]:hidden">
              <LangPanel
                prefix="En"
                title={article.titleEn}
                excerpt={article.excerptEn ?? ""}
                body={article.bodyEn ?? ""}
                recommendations={article.recommendationsEn ?? ""}
                titleLabel="Title"
                excerptLabel="Excerpt"
                bodyLabel="Body (Markdown)"
                recsLabel="BG recommendations (Markdown)"
                onBodyChange={(v) => setBodyLen((p) => ({ ...p, en: v.length }))}
              />
            </TabsContent>
          </Tabs>
        </section>

        {/* Inspector de metadatos */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <section className="crm-card p-5">
            <p className="crm-eyebrow mb-4">Metadatos</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className={metaLabel} htmlFor="slug">Slug</label>
                <input id="slug" name="slug" defaultValue={article.slug} className="crm-input" />
              </div>
              <div>
                <label className={metaLabel}>Categoría</label>
                <CategoryCombobox name="category" defaultValue={article.category ?? ""} categories={categories} />
              </div>
              <div>
                <label className={metaLabel} htmlFor="sourceName">Fuente</label>
                <input id="sourceName" name="sourceName" defaultValue={article.sourceName ?? ""} className="crm-input" />
              </div>
              <div>
                <label className={metaLabel} htmlFor="sourceUrl">URL de la fuente</label>
                <input id="sourceUrl" name="sourceUrl" defaultValue={article.sourceUrl ?? ""} className="crm-input" />
              </div>
              <div>
                <label className={metaLabel}>Portada</label>
                <CoverImageInput defaultUrl={article.coverUrl ?? ""} defaultPathname={article.coverPathname ?? ""} />
              </div>
              <label className="flex items-start gap-2.5 rounded-[var(--crm-r-md)] border border-[var(--crm-line)] bg-[var(--crm-surface)] px-3 py-2.5 text-[12.5px] leading-snug text-[var(--crm-ink-soft)]">
                <input type="checkbox" name="featured" defaultChecked={article.featured} className="mt-0.5 size-4 shrink-0 accent-[var(--crm-accent)]" />
                Destacar en la portada del blog
              </label>
            </div>
          </section>
        </aside>
      </div>

      <SaveBar count={bodyLen[lang]} />
    </form>
  );
}
