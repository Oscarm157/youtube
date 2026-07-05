"use client";

import { Fragment, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { List, LayoutGrid } from "lucide-react";
import type { LeadStatus, LeadSource, LeadQualification } from "@/lib/schema";
import type { UserRole } from "@/lib/schema";
import { canEditLead } from "@/lib/permissions";
import { updateLeadStatus } from "@/app/admin/actions";
import { PageHeader } from "./PageShell";
import { STATUS_ORDER } from "./status";
import { BoardColumn } from "./BoardColumn";

export type BoardLead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  status: LeadStatus;
  assignedTo: string | null;
  qualification: LeadQualification | null;
  createdAt: Date | string | null;
};

type Viewer = { id: string; role: UserRole };

export function BoardView({
  leads,
  viewer,
  userMap,
}: {
  leads: BoardLead[];
  viewer: Viewer;
  userMap: Record<string, string>;
}) {
  const [items, setItems] = useState<BoardLead[]>(leads);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // Last-known good status per lead so a failed action can roll back precisely.
  const prevStatus = useRef<Record<string, LeadStatus>>({});

  // Drag-to-scroll horizontal: arrastrar el fondo del board paneando la tabla.
  // No se activa sobre tarjetas (draggable) ni controles, para no chocar con el DnD.
  const scrollRef = useRef<HTMLDivElement>(null);
  const pan = useRef({ active: false, startX: 0, startScroll: 0 });

  function onPanStart(e: React.MouseEvent) {
    const el = scrollRef.current;
    if (!el) return;
    if ((e.target as HTMLElement).closest('[draggable="true"], a, button, select, input')) return;
    pan.current = { active: true, startX: e.pageX, startScroll: el.scrollLeft };
    el.style.cursor = "grabbing";
  }
  function onPanMove(e: React.MouseEvent) {
    if (!pan.current.active || !scrollRef.current) return;
    e.preventDefault();
    scrollRef.current.scrollLeft = pan.current.startScroll - (e.pageX - pan.current.startX);
  }
  function onPanEnd() {
    pan.current.active = false;
    if (scrollRef.current) scrollRef.current.style.cursor = "";
  }

  const grouped = useMemo(() => {
    const g: Record<LeadStatus, BoardLead[]> = {
      new: [], contacted: [], following_up: [], proposal: [], won: [], lost: [],
    };
    for (const l of items) g[l.status].push(l);
    return g;
  }, [items]);

  const ownerName = (lead: BoardLead) =>
    lead.assignedTo ? userMap[lead.assignedTo] ?? null : null;

  const canDragCard = (lead: BoardLead) =>
    canEditLead(viewer, { assignedTo: lead.assignedTo });

  const draggedLead = draggingId ? items.find((l) => l.id === draggingId) ?? null : null;

  function move(leadId: string, status: LeadStatus) {
    // Clear drag state on drop: when the card is re-parented to another column,
    // its native dragend can be lost, leaving the card dimmed until the next render.
    setDraggingId(null);
    const lead = items.find((l) => l.id === leadId);
    if (!lead || lead.status === status) return;
    if (!canDragCard(lead)) return;

    prevStatus.current[leadId] = lead.status;
    setItems((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status } : l))
    );

    startTransition(async () => {
      try {
        await updateLeadStatus(leadId, status);
      } catch {
        // Roll back to the column it came from; the server rejected the move.
        const back = prevStatus.current[leadId];
        setItems((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: back } : l))
        );
      }
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Comercial"
        title={
          <span className="flex items-baseline gap-2.5">
            Pipeline
            <span className="crm-num text-[13px] font-normal text-[var(--crm-ink-mute)]">
              {items.length}
            </span>
          </span>
        }
        description={
          viewer.role === "viewer"
            ? "Vista de solo lectura del pipeline."
            : "Arrastra un lead a otra columna para cambiar su estado."
        }
        actions={
          <div className="inline-flex items-center rounded-lg border border-[var(--crm-line)] bg-[var(--crm-surface)] p-0.5">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-[var(--crm-ink-soft)] transition-colors hover:text-[var(--crm-ink)]"
            >
              <List className="size-3.5" strokeWidth={1.75} />
              Lista
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--crm-surface-3)] px-2.5 py-1.5 text-[13px] font-medium text-[var(--crm-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <LayoutGrid className="size-3.5 text-[var(--crm-accent)]" strokeWidth={2} />
              Pipeline
            </span>
          </div>
        }
      />

      <div
        ref={scrollRef}
        onMouseDown={onPanStart}
        onMouseMove={onPanMove}
        onMouseUp={onPanEnd}
        onMouseLeave={onPanEnd}
        className="scrollbar-hide -mx-5 cursor-grab overflow-x-auto px-5 pb-3 sm:mx-0 sm:px-0"
      >
        <div className="flex snap-x items-start gap-3">
          {STATUS_ORDER.map((status) => {
            const accepts =
              !!draggedLead &&
              draggedLead.status !== status &&
              canDragCard(draggedLead);
            return (
              <Fragment key={status}>
                {/* won/lost van como "cerrados", separados del pipeline activo */}
                {status === "won" && (
                  <div className="mx-1.5 flex shrink-0 flex-col items-center gap-2 self-stretch py-1">
                    <div className="w-px flex-1 bg-gradient-to-b from-transparent via-[var(--crm-line)] to-transparent" aria-hidden />
                    <span className="crm-eyebrow rotate-180 [writing-mode:vertical-rl] text-[var(--crm-ink-faint)]">
                      Cerrados
                    </span>
                    <div className="w-px flex-1 bg-gradient-to-b from-transparent via-[var(--crm-line)] to-transparent" aria-hidden />
                  </div>
                )}
                <BoardColumn
                  status={status}
                  closed={status === "won" || status === "lost"}
                  leads={grouped[status]}
                  ownerName={ownerName}
                  canDragCard={canDragCard}
                  accepts={accepts}
                  draggingId={draggingId}
                  onDragStartCard={setDraggingId}
                  onDragEndCard={() => setDraggingId(null)}
                  onDropInColumn={move}
                />
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
