import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/db";
import { analyses, type Analysis } from "@/lib/schema";
import { ResultTabs } from "@/components/ResultTabs";

export const dynamic = "force-dynamic";

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let row: Analysis | undefined;
  try {
    [row] = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
  } catch {
    row = undefined; // id inválido u otra falla de DB
  }
  if (!row) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver
      </Link>

      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">{row.title ?? "Análisis"}</h1>
        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {row.url} · idioma {row.lang} · transcript {row.source}
        </a>
      </header>

      <ResultTabs results={row.results} />
    </main>
  );
}
