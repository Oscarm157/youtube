"use client";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { runAnalysis, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/states";

export function AnalyzeForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(runAnalysis, null);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-col gap-3 sm:flex-row">
        <Input
          name="url"
          type="url"
          required
          disabled={pending}
          placeholder="https://youtube.com/watch?v=..."
          className="flex-1"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Analizando..." : "Analizar"}
        </Button>
      </form>
      {pending ? <Loading label="Bajando transcript y analizando los 4 modos..." /> : null}
    </div>
  );
}
