"use client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Markdown } from "@/components/Markdown";
import { ExportButtons } from "@/components/ExportButtons";
import { NewsletterPanel } from "@/components/NewsletterPanel";
import { SocialPanel } from "@/components/SocialPanel";
import { Empty } from "@/components/states";
import type { Extraccion } from "@/lib/schema";

const GROUPS: { key: keyof Extraccion; label: string }[] = [
  { key: "cifras", label: "Cifras y datos" },
  { key: "nombres", label: "Nombres y menciones" },
  { key: "herramientas", label: "Herramientas y recursos" },
  { key: "pasos", label: "Pasos / proceso" },
  { key: "citas", label: "Citas" },
];

function extraccionToMarkdown(e: Extraccion): string {
  const blocks = GROUPS.filter((g) => e[g.key].length > 0).map(
    (g) => `## ${g.label}\n${e[g.key].map((it) => `- ${it}`).join("\n")}`
  );
  return blocks.join("\n\n");
}

function ExtraccionView({ e }: { e: Extraccion }) {
  const groups = GROUPS.filter((g) => e[g.key].length > 0);
  if (groups.length === 0) {
    return <Empty title="Sin datos concretos" hint="Estos videos no traían cifras, nombres ni pasos para extraer." />;
  }
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.key}>
          <h3 className="mb-2 text-sm font-semibold">{g.label}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/90">
            {e[g.key].map((it, i) => (
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

export function ResultTabs({
  id,
  base,
  resumen,
  resumenExtendido,
  extraccion,
  blog,
  blogHtml,
  social,
  socialHtml,
}: {
  id: string;
  base: string;
  resumen: string;
  resumenExtendido: string;
  extraccion: Extraccion;
  blog: string | null;
  blogHtml: string | null;
  social: string | null;
  socialHtml: string | null;
}) {
  const datosMd = extraccionToMarkdown(extraccion);

  return (
    <Tabs defaultValue="resumen" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="resumen">Resumen</TabsTrigger>
        <TabsTrigger value="extendido">Extendido</TabsTrigger>
        <TabsTrigger value="datos">Datos</TabsTrigger>
        <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
        <TabsTrigger value="social">Social</TabsTrigger>
      </TabsList>

      <TabsContent value="resumen" className="space-y-4 pt-3">
        <ExportButtons base={`${base}-resumen`} markdown={resumen} />
        <Markdown>{resumen}</Markdown>
      </TabsContent>

      <TabsContent value="extendido" className="space-y-4 pt-3">
        <ExportButtons base={`${base}-extendido`} markdown={resumenExtendido} />
        <Markdown>{resumenExtendido}</Markdown>
      </TabsContent>

      <TabsContent value="datos" className="space-y-4 pt-3">
        {datosMd ? <ExportButtons base={`${base}-datos`} markdown={datosMd} /> : null}
        <ExtraccionView e={extraccion} />
      </TabsContent>

      <TabsContent value="newsletter" className="pt-3">
        <NewsletterPanel id={id} base={base} blog={blog} blogHtml={blogHtml} />
      </TabsContent>

      <TabsContent value="social" className="pt-3">
        <SocialPanel id={id} base={base} social={social} socialHtml={socialHtml} />
      </TabsContent>
    </Tabs>
  );
}
