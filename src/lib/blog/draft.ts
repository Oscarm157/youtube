import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources";
import { BLOG_VOICE } from "./voice";

export type ArticleDraft = {
  slug: string;
  titleEs: string;
  titleEn: string;
  excerptEs: string;
  excerptEn: string;
  bodyEs: string;
  bodyEn: string;
  recommendationsEs: string;
  recommendationsEn: string;
};

const TOOL: Tool = {
  name: "emit_article",
  description: "Devuelve la nota de blog redactada en español e inglés a partir de la fuente.",
  input_schema: {
    type: "object",
    properties: {
      slug: { type: "string", description: "kebab-case en español, corto y descriptivo" },
      titleEs: { type: "string" },
      titleEn: { type: "string" },
      excerptEs: { type: "string", description: "Una oración factual, ~160 caracteres" },
      excerptEn: { type: "string" },
      bodyEs: { type: "string", description: "Cuerpo en Markdown, 2 a 4 párrafos" },
      bodyEn: { type: "string", description: "Traducción fiel del cuerpo, Markdown" },
      recommendationsEs: { type: "string", description: "Markdown con 3-5 viñetas, o vacío si no aplica" },
      recommendationsEn: { type: "string" },
    },
    required: ["slug", "titleEs", "titleEn", "excerptEs", "excerptEn", "bodyEs", "bodyEn", "recommendationsEs", "recommendationsEn"],
  },
};

const stripDashes = (s: string) => s.replace(/—/g, ", ").replace(/\s*—\s*/g, ", ");

export async function draftFromSource(input: {
  source: string;
  sourceName?: string;
  category?: string;
  guidance?: string;
}): Promise<ArticleDraft> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const meta = [input.sourceName ? `Fuente: ${input.sourceName}` : "", input.category ? `Categoría: ${input.category}` : ""]
    .filter(Boolean)
    .join(" · ");
  const angle = input.guidance
    ? `Enfoque pedido por el editor (síguelo sin inventar datos ni salirte de la fuente): ${input.guidance}\n\n`
    : "";
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2400,
    system: BLOG_VOICE,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "emit_article" },
    messages: [
      {
        role: "user",
        content: `${meta ? meta + "\n\n" : ""}${angle}Texto fuente:\n"""\n${input.source}\n"""\n\nRedacta la nota siguiendo las reglas de voz. Devuelve la herramienta emit_article.`,
      },
    ],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("draft_failed");
  const d = block.input as ArticleDraft;
  // Defensa anti em-dash por si el modelo se escapa.
  for (const k of ["titleEs", "titleEn", "excerptEs", "excerptEn", "bodyEs", "bodyEn", "recommendationsEs", "recommendationsEn"] as const) {
    if (typeof d[k] === "string") d[k] = stripDashes(d[k]);
  }
  return d;
}
