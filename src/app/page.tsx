import Link from "next/link";
import { desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { analyses } from "@/lib/schema";
import { AnalyzeForm } from "@/components/AnalyzeForm";

// El análisis (transcript + Claude) de videos largos puede pasar de 60s. Pro permite 300.
export const maxDuration = 300;
// Lee DB en cada request; no prerender en build (sin DATABASE_URL truena).
export const dynamic = "force-dynamic";

async function recentAnalyses() {
  try {
    return await db
      .select({
        id: analyses.id,
        sources: analyses.sources,
        createdAt: analyses.createdAt,
      })
      .from(analyses)
      .orderBy(desc(analyses.createdAt))
      .limit(12);
  } catch {
    // Sin DATABASE_URL configurada todavía: el form igual funciona.
    return [];
  }
}

export default async function Home() {
  const recent = await recentAnalyses();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Analizador de YouTube</h1>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        Pega 1 a 3 fuentes: videos de YouTube o sitios web. Sale resumen, versión extendida, datos, y
        un newsletter en estilo Whitepaper. En español.
      </p>

      <AnalyzeForm />

      {recent.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Historial
          </h2>
          <ul className="divide-y rounded-xl border">
            {recent.map((r) => {
              const first = r.sources[0];
              const label = first?.title ?? first?.url ?? "Análisis";
              const extra = r.sources.length > 1 ? ` +${r.sources.length - 1}` : "";
              return (
                <li key={r.id}>
                  <Link
                    href={`/a/${r.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="truncate">
                      {label}
                      {extra}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                          })
                        : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
