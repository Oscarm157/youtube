// Análisis del transcript con Claude. Salida SIEMPRE en español.
import Anthropic from "@anthropic-ai/sdk";
import type { Tool, MessageCreateParamsNonStreaming, Message } from "@anthropic-ai/sdk/resources";
import type { Extraccion } from "./schema";

// Primario y fallback por si el id no valida en la cuenta/SDK.
const MODELS = ["claude-sonnet-5", "claude-sonnet-4-6"];
// Análisis (resumen/extendido/datos) corre en Haiku: 1/3 del precio, tarea mecánica.
const HAIKU = ["claude-haiku-4-5", "claude-sonnet-5"];

export const stripDashes = (s: string) => s.replace(/\s*—\s*/g, ", ");

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Falta ANTHROPIC_API_KEY en .env.local");
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// Llama a Claude probando modelos en orden; si el id no existe (404), pasa al siguiente.
export async function call(
  params: Omit<MessageCreateParamsNonStreaming, "model">,
  models: string[] = MODELS
): Promise<Message> {
  const c = client();
  let lastErr: unknown;
  for (const model of models) {
    try {
      return await c.messages.create({ ...params, model });
    } catch (e) {
      if (e instanceof Anthropic.APIError && e.status === 404) {
        lastErr = e;
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

export function textFrom(res: Message): string {
  return res.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}

const BASE =
  "Analizas la transcripción de uno o varios videos de YouTube. Responde SIEMPRE en español, aunque los videos estén en inglés. " +
  "Prohibido inventar lo que no aparece en la transcripción. Nada de frases huecas de marketing. Sin em-dashes.";

// Un solo prompt cubre los tres entregables: la transcripción viaja una vez, no tres.
const ANALISIS_SYS =
  `${BASE}\n\nAnaliza la transcripción y llena la herramienta emit_analisis con tres entregables:\n` +
  `- resumen (Markdown conciso): 1) **TL;DR** en 2 o 3 frases; 2) **Puntos clave** en bullets con las ideas que importan; 3) **Contexto**: quién habla y para quién, si se infiere.\n` +
  `- resumenExtendido (Markdown, profundo pero sin relleno): reconstruye el argumento completo (la tesis, cómo se desarrolla, los matices, los ejemplos y cifras concretas, las conclusiones) con encabezados. Que quien lo lea entienda el video casi tan bien como si lo hubiera visto. No repitas el TL;DR, ve al fondo.\n` +
  `- Los datos concretos: cifras, nombres, herramientas, pasos y citas, solo lo explícito. Categoría sin nada, vacía.`;

const ANALISIS_TOOL: Tool = {
  name: "emit_analisis",
  description: "Resumen, resumen extendido y datos concretos extraídos de los videos.",
  input_schema: {
    type: "object",
    properties: {
      resumen: { type: "string", description: "Resumen conciso en Markdown (TL;DR, puntos clave, contexto)" },
      resumenExtendido: { type: "string", description: "Resumen extendido y profundo en Markdown, con encabezados" },
      cifras: { type: "array", items: { type: "string" }, description: "Cifras, fechas, porcentajes o montos, con su contexto" },
      nombres: { type: "array", items: { type: "string" }, description: "Personas, empresas, productos o lugares nombrados" },
      herramientas: { type: "array", items: { type: "string" }, description: "Herramientas, tecnologías, servicios, libros o recursos mencionados" },
      pasos: { type: "array", items: { type: "string" }, description: "Si se enseña un proceso, los pasos en orden; si no aplica, vacío" },
      citas: { type: "array", items: { type: "string" }, description: "Frases textuales memorables o clave, literales de los videos" },
    },
    required: ["resumen", "resumenExtendido", "cifras", "nombres", "herramientas", "pasos", "citas"],
  },
};

export type Analysis3 = { resumen: string; resumenExtendido: string; extraccion: Extraccion };

export async function analyze(transcript: string): Promise<Analysis3> {
  const res = await call(
    {
      max_tokens: 8000,
      system: ANALISIS_SYS,
      tools: [ANALISIS_TOOL],
      tool_choice: { type: "tool", name: "emit_analisis" },
      messages: [{ role: "user", content: `<transcripcion>\n${transcript}\n</transcripcion>` }],
    },
    HAIKU
  );
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("analisis_failed");
  const o = block.input as Record<string, unknown>;
  // El modelo a veces devuelve un campo que no es array (string, null): coaccionar sin crashear.
  const clean = (a: unknown): string[] =>
    (Array.isArray(a) ? a : a == null ? [] : [a]).map((x) => stripDashes(String(x)));
  const text = (v: unknown): string => stripDashes(typeof v === "string" ? v : String(v ?? ""));
  return {
    resumen: text(o.resumen),
    resumenExtendido: text(o.resumenExtendido),
    extraccion: {
      cifras: clean(o.cifras),
      nombres: clean(o.nombres),
      herramientas: clean(o.herramientas),
      pasos: clean(o.pasos),
      citas: clean(o.citas),
    },
  };
}
