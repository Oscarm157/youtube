"use client";

import { ErrorState } from "@/components/states";

export default function ItemsError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      hint="No se pudieron cargar los items. Intenta de nuevo."
      reset={reset}
    />
  );
}
