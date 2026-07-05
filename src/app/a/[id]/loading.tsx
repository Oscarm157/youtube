import { Loading } from "@/components/states";

export default function LoadingAnalysis() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-12">
      <Loading label="Cargando análisis..." />
    </div>
  );
}
