"use client";
import { ErrorState } from "@/components/states";

export default function AnalysisError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-12">
      <ErrorState reset={reset} />
    </div>
  );
}
