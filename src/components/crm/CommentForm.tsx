"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Send, Loader2 } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="crm-btn crm-btn-primary self-end"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" strokeWidth={2} /> : <Send className="size-3.5" strokeWidth={1.75} />}
      {pending ? "Guardando…" : "Agregar nota"}
    </button>
  );
}

export function CommentForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      action={async (fd) => {
        await action(fd);
        ref.current?.reset();
      }}
      className="flex flex-col gap-2"
    >
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Registra una llamada, un acuerdo, un siguiente paso…"
        className="crm-textarea resize-y leading-relaxed"
      />
      <SubmitButton />
    </form>
  );
}
