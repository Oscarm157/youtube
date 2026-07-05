"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { analyses, type Source } from "@/lib/schema";
import { getTranscript, youtubeId } from "@/lib/transcript";
import { analyze } from "@/lib/analyze";
import { generateBlog } from "@/lib/newsletter-voice";

const urlSchema = z
  .string()
  .url()
  .refine((u) => youtubeId(u) !== null, "No parece un link de YouTube.");

// Rate-limit in-memory (single-user; frena runaway o abuso si se filtra la URL).
const WINDOW_MS = 60_000;
const MAX = 8;
let hits: number[] = [];
function limited(): boolean {
  const now = Date.now();
  hits = hits.filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  return hits.length > MAX;
}

export type FormState = { error: string } | null;

export async function runAnalysis(_prev: FormState, formData: FormData): Promise<FormState> {
  if (limited()) return { error: "Demasiadas solicitudes. Espera un momento." };

  // 1 a 3 links (inputs name="url"), sin vacíos ni duplicados.
  const raw = formData
    .getAll("url")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const urls = [...new Set(raw)].slice(0, 3);

  if (urls.length === 0) return { error: "Pega al menos un link de YouTube." };
  for (const u of urls) {
    const ok = urlSchema.safeParse(u);
    if (!ok.success) return { error: `${u}: ${ok.error.issues[0]?.message ?? "URL inválida."}` };
  }

  let id: string;
  try {
    const sources: Source[] = [];
    const parts: string[] = [];
    for (let i = 0; i < urls.length; i++) {
      const t = await getTranscript(urls[i]);
      sources.push({ url: urls[i], title: t.title, lang: t.lang, source: t.source, videoId: t.videoId });
      parts.push(`## Video ${i + 1}: ${t.title ?? urls[i]}\n\n${t.text}`);
    }
    const transcript = parts.join("\n\n---\n\n");
    const { resumen, resumenExtendido, extraccion } = await analyze(transcript);

    const [row] = await db
      .insert(analyses)
      .values({ sources, transcript, resumen, resumenExtendido, extraccion, blog: null })
      .returning({ id: analyses.id });
    id = row.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al analizar los videos." };
  }

  redirect(`/a/${id}`);
}

export async function generateBlogAction(id: string): Promise<{ error: string } | void> {
  let row;
  try {
    [row] = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
  } catch {
    return { error: "No se pudo cargar el análisis." };
  }
  if (!row) return { error: "El análisis no existe." };

  try {
    const blog = await generateBlog(row.transcript, row.sources);
    await db.update(analyses).set({ blog }).where(eq(analyses.id, id));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al generar el newsletter." };
  }
  revalidatePath(`/a/${id}`);
}
