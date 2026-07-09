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

// Dos llamadas en PARALELO: el resumen extendido (salida larga) es el cuello de botella,
// así que corre solo, y resumen+datos van juntos en otra. Tiempo de pared ≈ la más lenta,
// no la suma: cabe en los 60s de Vercel aun con transcripts largos.
const RESUMEN_SYS =
  `${BASE}\n\nLlena la herramienta emit_resumen con un resumen conciso y los datos concretos:\n` +
  `- resumen (Markdown): 1) **TL;DR** en 2 o 3 frases; 2) **Puntos clave** en bullets con las ideas que importan; 3) **Contexto**: quién habla y para quién, si se infiere.\n` +
  `- cifras, nombres, herramientas, pasos y citas: solo lo explícito. Categoría sin nada, vacía.`;

const RESUMEN_TOOL: Tool = {
  name: "emit_resumen",
  description: "Resumen conciso y datos concretos extraídos de los videos.",
  input_schema: {
    type: "object",
    properties: {
      resumen: { type: "string", description: "Resumen conciso en Markdown (TL;DR, puntos clave, contexto)" },
      cifras: { type: "array", items: { type: "string" }, description: "Cifras, fechas, porcentajes o montos, con su contexto" },
      nombres: { type: "array", items: { type: "string" }, description: "Personas, empresas, productos o lugares nombrados" },
      herramientas: { type: "array", items: { type: "string" }, description: "Herramientas, tecnologías, servicios, libros o recursos mencionados" },
      pasos: { type: "array", items: { type: "string" }, description: "Si se enseña un proceso, los pasos en orden; si no aplica, vacío" },
      citas: { type: "array", items: { type: "string" }, description: "Frases textuales memorables o clave, literales de los videos" },
    },
    required: ["resumen", "cifras", "nombres", "herramientas", "pasos", "citas"],
  },
};

const EXTENDIDO_SYS =
  `${BASE}\n\nEscribe un resumen EXTENDIDO en Markdown, profundo pero sin relleno. ` +
  `Reconstruye el argumento completo: la tesis, cómo se desarrolla, los matices, los ejemplos concretos y las cifras que se mencionan, ` +
  `y las conclusiones. Usa secciones con encabezados. Que quien lo lea entienda el video casi tan bien como si lo hubiera visto, ` +
  `pero en una fracción del tiempo. No repitas el TL;DR, ve al fondo. Devuelve solo el Markdown.`;

// Haiku a veces devuelve el array como un solo string con los items envueltos
// en <item>...</item> en vez de un array limpio. Desenvolvemos esos tags.
const clean = (a: unknown): string[] => {
  const arr = Array.isArray(a) ? a : a == null ? [] : [a];
  return arr
    .flatMap((x) => {
      const s = String(x);
      const items = [...s.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
      return items.length ? items : [s];
    })
    .map((x) => stripDashes(x.trim()))
    .filter(Boolean);
};

async function resumenYDatos(transcript: string): Promise<{ resumen: string; extraccion: Extraccion }> {
  const res = await call(
    {
      max_tokens: 3000,
      system: RESUMEN_SYS,
      tools: [RESUMEN_TOOL],
      tool_choice: { type: "tool", name: "emit_resumen" },
      messages: [{ role: "user", content: `<transcripcion>\n${transcript}\n</transcripcion>` }],
    },
    HAIKU
  );
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("resumen_failed");
  const o = block.input as Record<string, unknown>;
  return {
    resumen: stripDashes(typeof o.resumen === "string" ? o.resumen : String(o.resumen ?? "")),
    extraccion: {
      cifras: clean(o.cifras),
      nombres: clean(o.nombres),
      herramientas: clean(o.herramientas),
      pasos: clean(o.pasos),
      citas: clean(o.citas),
    },
  };
}

async function extendido(transcript: string): Promise<string> {
  const res = await call(
    {
      max_tokens: 4000,
      system: EXTENDIDO_SYS,
      messages: [{ role: "user", content: `<transcripcion>\n${transcript}\n</transcripcion>` }],
    },
    HAIKU
  );
  return stripDashes(textFrom(res));
}

export type Analysis3 = { resumen: string; resumenExtendido: string; extraccion: Extraccion };

export async function analyze(transcript: string): Promise<Analysis3> {
  const [rd, resumenExtendido] = await Promise.all([resumenYDatos(transcript), extendido(transcript)]);
  return { resumen: rd.resumen, resumenExtendido, extraccion: rd.extraccion };
}
