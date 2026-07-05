// Transcript de YouTube vía Supadata (proxies rotativos: no se bloquea como yt-dlp local).
// GET /v1/transcript?url=..&text=true&mode=auto  ->  200 {content,lang} | 202 {jobId} (videos largos).

const SUPADATA_BASE = "https://api.supadata.ai/v1";

export type TranscriptResult = {
  text: string;
  lang: string;
  title: string | null;
  videoId: string | null;
  source: string; // captions | generate
};

function apiKey(): string {
  const k = process.env.SUPADATA_API_KEY;
  if (!k) throw new Error("Falta SUPADATA_API_KEY en .env.local");
  return k;
}

export function youtubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

// Título por oEmbed (sin key, endpoint distinto al player: no sufre el bot-block).
async function fetchTitle(url: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { cache: "no-store" }
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { title?: unknown };
    return typeof j.title === "string" ? j.title : null;
  } catch {
    return null;
  }
}

async function pollJob(jobId: string): Promise<{ content: string; lang: string }> {
  const deadline = Date.now() + 180_000; // 3 min
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const r = await fetch(`${SUPADATA_BASE}/transcript/${jobId}`, {
      headers: { "x-api-key": apiKey() },
      cache: "no-store",
    });
    const j = (await r.json()) as {
      status?: string;
      content?: string;
      lang?: string;
      error?: unknown;
    };
    if (j.status === "failed" || j.error) throw new Error("La transcripción falló en Supadata.");
    if (j.content) return { content: j.content, lang: j.lang ?? "" };
  }
  throw new Error("La transcripción tardó demasiado (timeout).");
}

export async function getTranscript(url: string): Promise<TranscriptResult> {
  const params = new URLSearchParams({ url, text: "true", mode: "auto" });
  const res = await fetch(`${SUPADATA_BASE}/transcript?${params}`, {
    headers: { "x-api-key": apiKey() },
    cache: "no-store",
  });

  if (res.status === 202) {
    const { jobId } = (await res.json()) as { jobId: string };
    const [{ content, lang }, title] = await Promise.all([pollJob(jobId), fetchTitle(url)]);
    if (content.length < 50) throw new Error("El video no tiene transcript utilizable.");
    return { text: content, lang: lang || "?", title, videoId: youtubeId(url), source: "generate" };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) throw new Error("SUPADATA_API_KEY inválida.");
    if (res.status === 429) throw new Error("Límite de Supadata alcanzado (free tier: 100/mes).");
    throw new Error(`Supadata error ${res.status}: ${body.slice(0, 200)}`);
  }

  const j = (await res.json()) as { content?: string; lang?: string };
  const content = j.content ?? "";
  if (content.length < 50) throw new Error("El video no tiene transcript utilizable.");
  const title = await fetchTitle(url);
  return { text: content, lang: j.lang || "?", title, videoId: youtubeId(url), source: "captions" };
}
