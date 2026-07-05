// Análisis del transcript con Claude. Salida SIEMPRE en español.
import Anthropic from "@anthropic-ai/sdk";
import type { Tool, MessageCreateParamsNonStreaming, Message } from "@anthropic-ai/sdk/resources";
import type { Extraccion } from "./schema";

// Primario y fallback por si el id no valida en la cuenta/SDK.
const MODELS = ["claude-sonnet-5", "claude-sonnet-4-6"];

export const stripDashes = (s: string) => s.replace(/\s*—\s*/g, ", ");

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Falta ANTHROPIC_API_KEY en .env.local");
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// Llama a Claude probando modelos en orden; si el id no existe (404), pasa al siguiente.
export async function call(params: Omit<MessageCreateParamsNonStreaming, "model">): Promise<Message> {
  const c = client();
  let lastErr: unknown;
  for (const model of MODELS) {
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

const RESUMEN =
  `${BASE}\n\nEntrega en Markdown, conciso:\n` +
  `1. **TL;DR** en 2 o 3 frases: de qué trata realmente.\n` +
  `2. **Puntos clave**: bullets con las ideas o afirmaciones que importan.\n` +
  `3. **Contexto**: quién habla y para quién, si se infiere.`;

const EXTENDIDO =
  `${BASE}\n\nEscribe un resumen EXTENDIDO en Markdown, profundo pero sin relleno. ` +
  `Reconstruye el argumento completo: la tesis, cómo se desarrolla, los matices, los ejemplos concretos y las cifras que se mencionan, ` +
  `y las conclusiones. Usa secciones con encabezados. Que quien lo lea entienda el video casi tan bien como si lo hubiera visto, ` +
  `pero en una fracción del tiempo. No repitas el TL;DR, ve al fondo.`;

async function textMode(system: string, transcript: string, maxTokens: number): Promise<string> {
  const res = await call({
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: `<transcripcion>\n${transcript}\n</transcripcion>` }],
  });
  return stripDashes(textFrom(res));
}

const EXTRACT_TOOL: Tool = {
  name: "emit_extraccion",
  description: "Datos concretos extraídos de los videos.",
  input_schema: {
    type: "object",
    properties: {
      cifras: { type: "array", items: { type: "string" }, description: "Cifras, fechas, porcentajes o montos, con su contexto" },
      nombres: { type: "array", items: { type: "string" }, description: "Personas, empresas, productos o lugares nombrados" },
      herramientas: { type: "array", items: { type: "string" }, description: "Herramientas, tecnologías, servicios, libros o recursos mencionados" },
      pasos: { type: "array", items: { type: "string" }, description: "Si se enseña un proceso, los pasos en orden; si no aplica, vacío" },
      citas: { type: "array", items: { type: "string" }, description: "Frases textuales memorables o clave, literales de los videos" },
    },
    required: ["cifras", "nombres", "herramientas", "pasos", "citas"],
  },
};

async function extractMode(transcript: string): Promise<Extraccion> {
  const res = await call({
    max_tokens: 2000,
    system: `${BASE}\n\nExtrae solo lo explícito en la transcripción. Si una categoría no tiene nada, devuélvela vacía. Usa la herramienta emit_extraccion.`,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "emit_extraccion" },
    messages: [{ role: "user", content: `<transcripcion>\n${transcript}\n</transcripcion>` }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("extraccion_failed");
  const e = block.input as Record<string, unknown>;
  // El modelo a veces devuelve un campo que no es array (string, null): coaccionar sin crashear.
  const clean = (a: unknown): string[] =>
    (Array.isArray(a) ? a : a == null ? [] : [a]).map((x) => stripDashes(String(x)));
  return {
    cifras: clean(e.cifras),
    nombres: clean(e.nombres),
    herramientas: clean(e.herramientas),
    pasos: clean(e.pasos),
    citas: clean(e.citas),
  };
}

export type Analysis3 = { resumen: string; resumenExtendido: string; extraccion: Extraccion };

export async function analyze(transcript: string): Promise<Analysis3> {
  const [resumen, resumenExtendido, extraccion] = await Promise.all([
    textMode(RESUMEN, transcript, 2000),
    textMode(EXTENDIDO, transcript, 4000),
    extractMode(transcript),
  ]);
  return { resumen, resumenExtendido, extraccion };
}
