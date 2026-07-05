"use client";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { runResumen, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/states";
import { Markdown } from "@/components/Markdown";

export function AnalyzeForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(runResumen, null);

  useEffect(() => {
    if (state && !state.ok) toast.error(state.error);
  }, [state]);

  return (
    <div className="space-y-6">
      <form action={action} className="flex flex-col gap-3 sm:flex-row">
        <Input
          name="url"
          type="url"
          required
          placeholder="https://youtube.com/watch?v=..."
          className="flex-1"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Analizando..." : "Analizar"}
        </Button>
      </form>

      {pending ? <Loading label="Bajando transcript y analizando..." /> : null}

      {state?.ok ? (
        <article className="rounded-xl border p-5">
          <header className="mb-3 border-b pb-3">
            <h2 className="text-sm font-semibold">{state.data.title ?? "Video"}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Idioma: {state.data.lang} · Transcript: {state.data.source}
            </p>
          </header>
          <Markdown>{state.data.resumen}</Markdown>
        </article>
      ) : null}
    </div>
  );
}
