import { AnalyzeForm } from "@/components/AnalyzeForm";

// El análisis (transcript + Claude) puede pasar del límite default de 10s en Vercel.
export const maxDuration = 60;

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Analizador de YouTube</h1>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        Pega un link de YouTube (inglés o español). Sale resumen, datos, ideas para reusar y una
        lectura crítica. En español.
      </p>
      <AnalyzeForm />
    </main>
  );
}
