"use server";
import { z } from "zod";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { analyses } from "@/lib/schema";
import { getTranscript, youtubeId } from "@/lib/transcript";
import { analyze } from "@/lib/analyze";

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

export type FormState = { error: string } | null;

export async function runAnalysis(_prev: FormState, formData: FormData): Promise<FormState> {
  if (limited()) return { error: "Demasiadas solicitudes. Espera un momento." };

  const parsed = schema.safeParse({ url: formData.get("url") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  let id: string;
  try {
    const t = await getTranscript(parsed.data.url);
    const results = await analyze(t.text);
    const [row] = await db
      .insert(analyses)
      .values({
        url: parsed.data.url,
        videoId: t.videoId,
        title: t.title,
        lang: t.lang,
        source: t.source,
        transcript: t.text,
        results,
      })
      .returning({ id: analyses.id });
    id = row.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al analizar el video." };
  }

  // redirect va fuera del try: lanza un control-flow que el catch no debe tragarse.
  redirect(`/a/${id}`);
}
