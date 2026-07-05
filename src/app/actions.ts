"use server";
import { z } from "zod";
import { checkBotId } from "botid/server";

import { getTranscript, youtubeId } from "@/lib/transcript";
import { analyzeResumen } from "@/lib/analyze";

const schema = z.object({
  url: z
    .string()
    .url("Pega una URL válida.")
    .refine((u) => youtubeId(u) !== null, "No parece un link de YouTube."),
});

// Rate-limit in-memory (single-user; frena runaway o abuso si se filtra la URL).
const WINDOW_MS = 60_000;
const MAX = 10;
let hits: number[] = [];
function limited(): boolean {
  const now = Date.now();
  hits = hits.filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  return hits.length > MAX;
}

export type ResumenResult = {
  title: string | null;
  lang: string;
  source: string;
  resumen: string;
};

export type ActionState =
  | { ok: true; data: ResumenResult }
  | { ok: false; error: string }
  | null;

export async function runResumen(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // BotID solo funciona en Vercel con protección client-side; fuera de eso truena.
  // Fail-open: si no está configurado, seguimos (el rate-limit protege igual).
  try {
    const { isBot } = await checkBotId();
    if (isBot) return { ok: false, error: "Bloqueado." };
  } catch {
    // BotID no disponible (VPS/local o falta client-side protection): continuar.
  }
  if (limited()) return { ok: false, error: "Demasiadas solicitudes. Espera un momento." };

  const parsed = schema.safeParse({ url: formData.get("url") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    const t = await getTranscript(parsed.data.url);
    const resumen = await analyzeResumen(t.text);
    return { ok: true, data: { title: t.title, lang: t.lang, source: t.source, resumen } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al analizar el video." };
  }
}
