"use client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Markdown } from "@/components/Markdown";
import type { AnalysisResult, Extraccion } from "@/lib/schema";

function ExtraccionView({ e }: { e: Extraccion }) {
  const groups = [
    { label: "Cifras y datos", items: e.cifras },
    { label: "Nombres y menciones", items: e.nombres },
    { label: "Herramientas y recursos", items: e.herramientas },
    { label: "Pasos / proceso", items: e.pasos },
    { label: "Citas", items: e.citas },
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos concretos para extraer de este video.</p>;
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.label}>
          <h3 className="mb-2 text-sm font-semibold">{g.label}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/90">
            {g.items.map((it, i) => (
              <li key={i} className="leading-6">
                {it}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function ResultTabs({ results }: { results: AnalysisResult }) {
  return (
    <Tabs defaultValue="resumen" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="resumen">Resumen</TabsTrigger>
        <TabsTrigger value="extraccion">Extracción</TabsTrigger>
        <TabsTrigger value="repurposing">Repurposing</TabsTrigger>
        <TabsTrigger value="critico">Crítico</TabsTrigger>
      </TabsList>
      <TabsContent value="resumen" className="pt-3">
        <Markdown>{results.resumen}</Markdown>
      </TabsContent>
      <TabsContent value="extraccion" className="pt-3">
        <ExtraccionView e={results.extraccion} />
      </TabsContent>
      <TabsContent value="repurposing" className="pt-3">
        <Markdown>{results.repurposing}</Markdown>
      </TabsContent>
      <TabsContent value="critico" className="pt-3">
        <Markdown>{results.critico}</Markdown>
      </TabsContent>
    </Tabs>
  );
}
