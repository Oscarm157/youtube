"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mic, Square } from "lucide-react";

import { generateSocialAction } from "@/app/actions";
import type { SocialFormat, SocialVoice } from "@/lib/social-voice";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loading } from "@/components/states";
import { Markdown } from "@/components/Markdown";
import { ExportButtons } from "@/components/ExportButtons";

const FORMATS: { value: SocialFormat; label: string }[] = [
  { value: "carrusel", label: "Carrusel" },
  { value: "video", label: "Video corto" },
  { value: "post", label: "Post / hilo" },
];
const VOICES: { value: SocialVoice; label: string }[] = [
  { value: "punchy", label: "Punchy" },
  { value: "whitepaper", label: "Whitepaper" },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
export function SocialPanel({
  id,
  base,
  social,
  socialHtml,
}: {
  id: string;
  base: string;
  social: string | null;
  socialHtml: string | null;
}) {
  const [formats, setFormats] = useState<SocialFormat[]>(["carrusel"]);
  const [voice, setVoice] = useState<SocialVoice>("punchy");
  const [direction, setDirection] = useState("");
  const [pending, start] = useTransition();
  const [listening, setListening] = useState(false);
  const [voiceOk, setVoiceOk] = useState(false);
  const recRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- detección client-only, evita hydration mismatch
    setVoiceOk(!!SR);
  }, []);

  const toggleFormat = (f: SocialFormat) =>
    setFormats((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const toggleDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = "es-MX";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) t += e.results[i][0].transcript;
      }
      if (t) setDirection((d) => (d ? d + " " : "") + t.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const generate = () => {
    if (formats.length === 0) {
      toast.error("Elige al menos un formato.");
      return;
    }
    start(async () => {
      const res = await generateSocialAction(id, {
        formats,
        voice,
        direction: direction.trim() || undefined,
      });
      if (res?.error) toast.error(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Formato (elige uno o más)</label>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <Button
              key={f.value}
              type="button"
              size="sm"
              variant={formats.includes(f.value) ? "default" : "outline"}
              onClick={() => toggleFormat(f.value)}
              disabled={pending}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Voz</label>
        <div className="flex flex-wrap gap-2">
          {VOICES.map((v) => (
            <Button
              key={v.value}
              type="button"
              size="sm"
              variant={voice === v.value ? "default" : "outline"}
              onClick={() => setVoice(v.value)}
              disabled={pending}
            >
              {v.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Dirección (opcional)</label>
        <div className="relative">
          <Textarea
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            disabled={pending}
            rows={3}
            placeholder="Enfócate en X, arranca con el dato de Y, tono más agresivo, para audiencia Z..."
            className="pr-12"
          />
          {voiceOk ? (
            <Button
              type="button"
              variant={listening ? "default" : "ghost"}
              size="icon"
              onClick={toggleDictation}
              disabled={pending}
              className="absolute right-2 top-2"
              aria-label={listening ? "Detener dictado" : "Dictar por voz"}
            >
              {listening ? <Square className="size-4" /> : <Mic className="size-4" />}
            </Button>
          ) : null}
        </div>
        {listening ? (
          <p className="text-xs text-muted-foreground">Escuchando, habla y el texto se irá agregando.</p>
        ) : null}
      </div>

      {social ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons base={`${base}-social`} markdown={social} html={socialHtml} />
            <Button onClick={generate} disabled={pending} variant="outline" size="sm">
              {pending ? "Regenerando..." : "Regenerar"}
            </Button>
          </div>
          {pending ? (
            <Loading label="Escribiendo los scripts..." />
          ) : (
            <article className="rounded-xl border p-5">
              <Markdown>{social}</Markdown>
            </article>
          )}
        </>
      ) : (
        <>
          <Button onClick={generate} disabled={pending}>
            {pending ? "Generando..." : "Generar script"}
          </Button>
          {pending ? <Loading label="Escribiendo los scripts para redes..." /> : null}
        </>
      )}
    </div>
  );
}
