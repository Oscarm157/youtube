// Generación de scripts para redes sociales a partir de los transcripts.
// Espejo de newsletter-voice.ts: misma plomería (call/textFrom/stripDashes, cache en el
// transcript), pero salida estructurada por formato para poder pasarla a un generador de
// video (HyperFrames). Selector de formato(s) y de voz.
import { call, textFrom, stripDashes } from "./analyze";
import type { Source } from "./schema";

// Salida corta (muy por debajo de maxDuration); hooks buenos importan, así que Sonnet 5.
const SOCIAL = ["claude-sonnet-5", "claude-sonnet-4-6"];

export type SocialFormat = "carrusel" | "video" | "post";
export type SocialVoice = "punchy" | "whitepaper";

const HARD_RULES = `REGLAS DURAS
- Usa SOLO hechos, cifras, nombres y ejemplos que estén en las fuentes. Si algo no está, no lo inventes.
- Cero relleno de IA: prohibido "transforma tu negocio", "solución integral", "lleva tu X al siguiente nivel", "sin fricciones", "potencia tu crecimiento", "empodera" y similares.
- No hagas que las cosas suenen fáciles o mágicas. Si algo es complejo, dilo.
- Sin em-dashes: usa comas, dos puntos o punto.
- Español de México.
- El hook se gana los primeros 2 segundos: una tensión, un dato fuerte, una promesa concreta o una pregunta. Nunca "en este video", "hoy te voy a hablar de" ni "el ponente dice".
- Cierra siempre con un remate y un CTA claro (guardar, seguir, comentar), no lo dejes colgado.`;

const VOICE_PUNCHY = `Eres guionista de contenido para redes sociales. Escribes para que alguien deje de scrollear: ritmo rápido, líneas cortas, una idea por línea, sin relleno. Hablas de tú, con filo. Cada frase se gana su lugar o se borra.`;

const VOICE_WHITEPAPER = `Eres redactor de negocios estilo Whitepaper.mx adaptado a redes: voz narrativa, perspicaz y humana, pero comprimida al formato social. Sin párrafos largos, con criterio y datos reales. Serio pero cercano, nunca corporativo ni condescendiente.`;

// Cada formato define bloques EXACTOS para que el script se pueda mapear a escenas/slides.
const FORMAT_SPECS: Record<SocialFormat, string> = {
  carrusel: `## Carrusel
De 6 a 10 slides. Una idea por slide, texto que se lee de un vistazo (1 a 2 frases). Estructura exacta:
**Slide 1 (hook):** el gancho.
**Slide 2:** ...
**Slide N (cierre + CTA):** remate y llamado a la acción.`,
  video: `## Guion de video corto (Reels/TikTok/Shorts, 20 a 45s)
Por escenas. La voz en off fluye como una narrativa continua; el texto en pantalla es corto. Estructura exacta:
**Hook (0-3s):** lo que se dice y aparece en los primeros segundos.
**Escena 1 · en pantalla:** texto del frame · **voz en off:** lo que se narra.
**Escena 2 · en pantalla:** ... · **voz en off:** ...
(3 a 6 escenas, una idea cada una)
**Cierre/CTA:** remate hablado y CTA.`,
  post: `## Post / hilo
Caption de feed o hilo corto. Estructura exacta:
**Hook:** primera línea que detiene el scroll.
**Cuerpo:** el desarrollo en líneas cortas, o puntos numerados si es una lista.
**Cierre:** remate y CTA.
Al final, 3 a 5 hashtags relevantes.`,
};

export async function generateSocial(
  transcript: string,
  sources: Source[],
  opts: { formats: SocialFormat[]; voice: SocialVoice; direction?: string }
): Promise<string> {
  const list = sources.map((s, i) => `Fuente ${i + 1}: ${s.title ?? s.url}`).join("\n");
  const system = `${opts.voice === "whitepaper" ? VOICE_WHITEPAPER : VOICE_PUNCHY}\n\n${HARD_RULES}`;
  const specs = opts.formats.map((f) => FORMAT_SPECS[f]).join("\n\n");
  const dir = opts.direction?.trim()
    ? `Dirección (síguela dándole más peso a lo que pide, sin inventar datos que no estén en las fuentes): ${opts.direction.trim()}\n\n`
    : "";
  // Transcript al frente con cache_control: regenerar con otra dirección/formato lo lee a ~0.1x.
  const res = await call(
    {
      max_tokens: 4000,
      system,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Fuentes:\n${list}\n\n<fuentes>\n${transcript}\n</fuentes>`,
              cache_control: { type: "ephemeral" },
            },
            {
              type: "text",
              text:
                dir +
                `A partir de estas fuentes, escribe el/los siguientes formatos para redes sociales. ` +
                `Cada idea sale de las fuentes, no inventes. Respeta EXACTO la estructura de bloques de cada formato ` +
                `(así se puede pasar a un generador de video). Si hay varios formatos, sepáralos con una regla \`---\`.\n\n${specs}\n\n` +
                `Devuelve solo el Markdown, sin preámbulo ni comentarios tuyos.`,
            },
          ],
        },
      ],
    },
    SOCIAL
  );
  return stripDashes(textFrom(res));
}
