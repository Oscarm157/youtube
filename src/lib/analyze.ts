// Análisis del transcript con Claude. 4 modos en paralelo. Salida SIEMPRE en español.
import Anthropic from "@anthropic-ai/sdk";
import type { Tool, MessageCreateParamsNonStreaming, Message } from "@anthropic-ai/sdk/resources";
import type { AnalysisResult, Extraccion } from "./schema";

// Primario y fallback por si el id no valida en la cuenta/SDK.
const MODELS = ["claude-sonnet-5", "claude-sonnet-4-6"];

const stripDashes = (s: string) => s.replace(/\s*—\s*/g, ", ");

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Falta ANTHROPIC_API_KEY en .env.local");
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// Llama a Claude probando modelos en orden; si el id no existe (404), pasa al siguiente.
async function call(params: Omit<MessageCreateParamsNonStreaming, "model">): Promise<Message> {
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

const BASE =
  "Analizas la transcripción de un video de YouTube. Responde SIEMPRE en español, aunque el video esté en inglés. " +
  "Prohibido inventar lo que no aparece en la transcripción. Nada de frases huecas de marketing. Sin em-dashes.";

const PROMPTS = {
  resumen:
    `${BASE}\n\nEntrega en Markdown:\n` +
    `1. **TL;DR** en 2 o 3 frases: de qué trata realmente.\n` +
    `2. **Puntos clave**: bullets con las ideas o afirmaciones que importan.\n` +
    `3. **Contexto**: quién habla y para quién, si se infiere.`,
  repurposing:
    `${BASE}\n\nConvierte el video en material reutilizable, en Markdown:\n` +
    `- **Hilo de X**: 5 a 7 tweets numerados.\n` +
    `- **Post de LinkedIn**: una versión lista para publicar.\n` +
    `- **Clips sugeridos**: 3 a 5 momentos fuertes, cada uno con una frase que lo describe.`,
  critico:
    `${BASE}\n\nAnálisis crítico en Markdown:\n` +
    `- **Qué sostiene** y con qué evidencia.\n` +
    `- **Qué le falta** o qué afirmaciones quedan débiles o sin respaldo.\n` +
    `- **Sesgos o intereses** aparentes.\n` +
    `- **Veredicto**: si vale la pena y para quién.`,
};

async function textMode(system: string, transcript: string): Promise<string> {
  const res = await call({
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: `<transcripcion>\n${transcript}\n</transcripcion>` }],
  });
  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  return stripDashes(text);
}

const EXTRACT_TOOL: Tool = {
  name: "emit_extraccion",
  description: "Datos concretos extraídos del video.",
  input_schema: {
    type: "object",
    properties: {
      cifras: { type: "array", items: { type: "string" }, description: "Cifras, fechas, porcentajes o montos, con su contexto" },
      nombres: { type: "array", items: { type: "string" }, description: "Personas, empresas, productos o lugares nombrados" },
      herramientas: { type: "array", items: { type: "string" }, description: "Herramientas, tecnologías, servicios, libros o recursos mencionados" },
      pasos: { type: "array", items: { type: "string" }, description: "Si el video enseña un proceso, los pasos en orden; si no aplica, vacío" },
      citas: { type: "array", items: { type: "string" }, description: "Frases textuales memorables o clave, literales del video" },
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
  const e = block.input as Partial<Extraccion>;
  const clean = (a?: string[]) => (a ?? []).map(stripDashes);
  return {
    cifras: clean(e.cifras),
    nombres: clean(e.nombres),
    herramientas: clean(e.herramientas),
    pasos: clean(e.pasos),
    citas: clean(e.citas),
  };
}

export async function analyze(transcript: string): Promise<AnalysisResult> {
  const [resumen, extraccion, repurposing, critico] = await Promise.all([
    textMode(PROMPTS.resumen, transcript),
    extractMode(transcript),
    textMode(PROMPTS.repurposing, transcript),
    textMode(PROMPTS.critico, transcript),
  ]);
  return { resumen, extraccion, repurposing, critico };
}

// Piloto: solo el modo Resumen, para validar el flujo completo antes de propagar.
export async function analyzeResumen(transcript: string): Promise<string> {
  return textMode(PROMPTS.resumen, transcript);
}
