"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { createItem } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type State = { error: string } | null;

export function ItemForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, formData) => (await createItem(formData)) ?? null,
    null
  );

  useEffect(() => {
    if (state === null) formRef.current?.reset();
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex gap-2">
      <Input
        name="title"
        placeholder="Nuevo item"
        maxLength={200}
        required
        aria-label="Título del item"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Agregando..." : "Agregar"}
      </Button>
    </form>
  );
}
