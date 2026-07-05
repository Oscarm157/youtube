"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { generateBlogAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/states";

export function GenerateBlogButton({ id, regenerate }: { id: string; regenerate?: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const go = () =>
    start(async () => {
      const res = await generateBlogAction(id);
      if (res?.error) toast.error(res.error);
      else router.refresh();
    });

  if (regenerate) {
    return (
      <Button onClick={go} disabled={pending} variant="outline" size="sm">
        {pending ? "Regenerando..." : "Regenerar"}
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Redacta un newsletter en estilo Whitepaper a partir de los videos, con facts reales y una lectura
        perspicaz.
      </p>
      <Button onClick={go} disabled={pending}>
        {pending ? "Generando..." : "Generar newsletter"}
      </Button>
      {pending ? <Loading label="Redactando el newsletter en voz Whitepaper..." /> : null}
    </div>
  );
}
