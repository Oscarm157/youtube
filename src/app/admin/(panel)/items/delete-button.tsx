"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteItem } from "./actions";
import { Button } from "@/components/ui/button";

export function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      await deleteItem(id);
      toast.success("Item eliminado.");
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onDelete}
      disabled={pending}
      aria-label="Eliminar item"
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
