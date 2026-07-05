import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { marked } from "marked";

import { db } from "@/lib/db";
import { analyses, type Analysis } from "@/lib/schema";
import { ResultTabs } from "@/components/ResultTabs";

export const dynamic = "force-dynamic";

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "analisis"
  );
}

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let row: Analysis | undefined;
  try {
    [row] = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
  } catch {
    row = undefined; // id inválido u otra falla de DB
  }
  if (!row) notFound();

  const title = row.sources[0]?.title ?? "Análisis";
  const blogHtml = row.blog ? await marked.parse(row.blog) : null;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver
      </Link>

      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <ul className="mt-2 space-y-0.5">
          {row.sources.map((s, i) => (
            <li key={i} className="text-xs text-muted-foreground">
              <a href={s.url} target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">
                {s.title ?? s.url}
              </a>
              <span>{" · "}{s.source === "web" ? "sitio web" : `video · ${s.lang}`}</span>
            </li>
          ))}
        </ul>
      </header>

      <ResultTabs
        id={row.id}
        base={slug(title)}
        resumen={row.resumen}
        resumenExtendido={row.resumenExtendido}
        extraccion={row.extraccion}
        blog={row.blog}
        blogHtml={blogHtml}
      />
    </main>
  );
}
