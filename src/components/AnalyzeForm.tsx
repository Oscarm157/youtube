"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

import { runAnalysis, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/states";

export function AnalyzeForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(runAnalysis, null);
  const nextId = useRef(1);
  const [rows, setRows] = useState<number[]>([0]);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  const add = () => setRows((r) => (r.length < 3 ? [...r, nextId.current++] : r));
  const remove = (id: number) => setRows((r) => r.filter((x) => x !== id));

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <div className="space-y-2">
          {rows.map((id, i) => (
            <div key={id} className="flex gap-2">
              <Input
                name="url"
                type="url"
                required={i === 0}
                disabled={pending}
                placeholder={i === 0 ? "https://youtube.com/watch?v=..." : "Otro video (opcional)"}
                className="flex-1"
              />
              {rows.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(id)}
                  disabled={pending}
                  aria-label="Quitar"
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          {rows.length < 3 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={add}
              disabled={pending}
              className="text-muted-foreground"
            >
              <Plus className="size-4" /> Agregar otro video
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Analizando..." : "Analizar"}
          </Button>
        </div>
      </form>

      {pending ? <Loading label="Bajando transcripts y analizando..." /> : null}
    </div>
  );
}
