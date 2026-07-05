"use client";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButtons({
  base,
  markdown,
  html,
}: {
  base: string;
  markdown: string;
  html?: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(markdown);
          toast.success("Copiado al portapapeles");
        }}
      >
        <Copy className="size-3.5" /> Copiar
      </Button>
      <Button variant="outline" size="sm" onClick={() => download(markdown, `${base}.md`, "text/markdown")}>
        <Download className="size-3.5" /> .md
      </Button>
      {html ? (
        <Button variant="outline" size="sm" onClick={() => download(html, `${base}.html`, "text/html")}>
          <Download className="size-3.5" /> .html
        </Button>
      ) : null}
    </div>
  );
}
