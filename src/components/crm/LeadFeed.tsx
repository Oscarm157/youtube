"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Activity } from "./Activity";
import { CommentForm } from "./CommentForm";
import { Files } from "./Files";
import { fmtDateTime } from "@/lib/crm-format";

type Comment = { id: string; body: string; createdAt: Date | string | null; authorName: string | null };
type Event = { id: string; kind: string; detail: string; createdAt: Date | string | null; authorName: string | null };
type FileRow = { id: string; name: string; contentType: string | null; size: number | null };

function initials(name: string | null): string {
  if (!name) return "S";
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "S";
}

function Count({ n }: { n: number }) {
  if (!n) return null;
  return <span className="crm-num ml-1.5 text-[11px] text-[var(--crm-ink-mute)]">{n}</span>;
}

/**
 * Centro vivo del record: un solo workspace tabulado para Actividad, Notas y
 * Archivos, en vez de tres cards apiladas iguales. Reusa los componentes y
 * server actions existentes sin cambiar sus contratos.
 */
export function LeadFeed({
  events,
  comments,
  files,
  leadId,
  editable,
  addComment,
}: {
  events: Event[];
  comments: Comment[];
  files: FileRow[];
  leadId: string;
  editable: boolean;
  addComment: (formData: FormData) => Promise<void>;
}) {
  return (
    <Tabs defaultValue="activity" className="gap-0">
      <TabsList variant="line" className="h-auto w-full justify-start gap-5 rounded-none border-b border-[var(--crm-line)] px-0 pb-2.5">
        <TabsTrigger value="activity" className="flex-none px-0 text-[13.5px]">
          Actividad <Count n={events.length} />
        </TabsTrigger>
        <TabsTrigger value="notes" className="flex-none px-0 text-[13.5px]">
          Notas <Count n={comments.length} />
        </TabsTrigger>
        <TabsTrigger value="files" className="flex-none px-0 text-[13.5px]">
          Archivos <Count n={files.length} />
        </TabsTrigger>
      </TabsList>

      <TabsContent value="activity" className="pt-5">
        <Activity events={events} />
      </TabsContent>

      <TabsContent value="notes" className="pt-5">
        {editable && <CommentForm action={addComment} />}
        {comments.length > 0 ? (
          <ul className={`crm-scroll max-h-[420px] space-y-3 overflow-y-auto pr-2.5 ${editable ? "mt-5" : ""}`}>
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--crm-line)] bg-[var(--crm-surface-3)] text-[10px] font-semibold text-[var(--crm-ink-soft)]"
                >
                  {initials(c.authorName)}
                </span>
                <div className="min-w-0 flex-1 rounded-lg border border-[var(--crm-line)] bg-[var(--crm-surface)] px-3.5 py-2.5">
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] font-medium text-[var(--crm-ink)]">
                      {c.authorName ?? "Sistema"}
                    </span>
                    <span className="crm-num shrink-0 text-[12px] text-[var(--crm-ink-mute)]">
                      {fmtDateTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--crm-ink-soft)]">
                    {c.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          !editable && <p className="text-[13.5px] text-[var(--crm-ink-mute)]">Aún no hay notas.</p>
        )}
      </TabsContent>

      <TabsContent value="files" className="pt-5">
        <Files leadId={leadId} editable={editable} files={files} />
      </TabsContent>
    </Tabs>
  );
}
