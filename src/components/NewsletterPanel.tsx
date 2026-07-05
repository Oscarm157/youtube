"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mic, Square } from "lucide-react";

import { generateBlogAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loading } from "@/components/states";
import { Markdown } from "@/components/Markdown";
import { ExportButtons } from "@/components/ExportButtons";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function NewsletterPanel({
  id,
  base,
  blog,
  blogHtml,
}: {
  id: string;
  base: string;
  blog: string | null;
  blogHtml: string | null;
}) {
  const [direction, setDirection] = useState("");
  const [pending, start] = useTransition();
  const [listening, setListening] = useState(false);
  const [voiceOk, setVoiceOk] = useState(false);
  const recRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceOk(!!SR);
  }, []);

  const toggleVoice = () => {
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

  const generate = () =>
    start(async () => {
      const res = await generateBlogAction(id, direction.trim() || undefined);
      if (res?.error) toast.error(res.error);
      else router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Dirección para el newsletter (opcional)</label>
        <div className="relative">
          <Textarea
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            disabled={pending}
            rows={3}
            placeholder="Dale más peso a X, enfócate en Y, arranca con la anécdota de Z, tono más directo..."
            className="pr-12"
          />
          {voiceOk ? (
            <Button
              type="button"
              variant={listening ? "default" : "ghost"}
              size="icon"
              onClick={toggleVoice}
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

      {blog ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons base={`${base}-newsletter`} markdown={blog} html={blogHtml} />
            <Button onClick={generate} disabled={pending} variant="outline" size="sm">
              {pending ? "Regenerando..." : "Regenerar"}
            </Button>
          </div>
          {pending ? (
            <Loading label="Redactando con tu dirección..." />
          ) : (
            <article className="rounded-xl border p-5">
              <Markdown>{blog}</Markdown>
            </article>
          )}
        </>
      ) : (
        <>
          <Button onClick={generate} disabled={pending}>
            {pending ? "Generando..." : "Generar newsletter"}
          </Button>
          {pending ? <Loading label="Redactando el newsletter en voz Whitepaper..." /> : null}
        </>
      )}
    </div>
  );
}
