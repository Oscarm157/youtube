"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { Inbox, CornerDownRight } from "lucide-react";
import type { LeadStatus } from "@/lib/schema";
import { STATUS_META } from "./status";
import { BoardCard } from "./BoardCard";
import type { BoardLead } from "./BoardView";

export function BoardColumn({
  status,
  leads,
  ownerName,
  canDragCard,
  accepts,
  draggingId,
  closed = false,
  onDragStartCard,
  onDragEndCard,
  onDropInColumn,
}: {
  status: LeadStatus;
  leads: BoardLead[];
  ownerName: (lead: BoardLead) => string | null;
  canDragCard: (lead: BoardLead) => boolean;
  // True while a drag is active and the dragged lead may legally land here.
  accepts: boolean;
  draggingId: string | null;
  // Terminal stage (won/lost): se muestra más angosta, como "cerrado".
  closed?: boolean;
  onDragStartCard: (id: string) => void;
  onDragEndCard: () => void;
  onDropInColumn: (leadId: string, status: LeadStatus) => void;
}) {
  const meta = STATUS_META[status];
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        if (!accepts) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!over) setOver(true);
      }}
      onDragLeave={(e) => {
        // Only clear when the pointer actually exits the column wrapper.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!accepts) return;
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDropInColumn(id, status);
      }}
      className={`flex shrink-0 snap-start flex-col ${closed ? "w-[252px]" : "w-[300px]"}`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${meta.dot} shadow-[0_0_0_3px_var(--crm-bg)]`} />
          <span className="text-[13.5px] font-semibold tracking-tight text-[var(--crm-ink)]">{meta.label}</span>
        </div>
        <span className="crm-num min-w-5 rounded-md border border-[var(--crm-line)] bg-[var(--crm-surface-2)] px-1.5 py-0.5 text-center text-[12px] font-medium text-[var(--crm-ink-soft)]">
          {leads.length}
        </span>
      </div>

      <div
        data-accepts={accepts}
        data-over={over && accepts}
        className="crm-dropzone scrollbar-hide flex max-h-[calc(100dvh-238px)] min-h-[140px] flex-1 flex-col gap-2 overflow-y-auto p-2"
      >
        <AnimatePresence initial={false}>
          {leads.map((lead, i) => (
            <BoardCard
              key={lead.id}
              lead={lead}
              index={i}
              ownerName={ownerName(lead)}
              draggable={canDragCard(lead)}
              dragging={draggingId === lead.id}
              onDragStart={() => onDragStartCard(lead.id)}
              onDragEnd={onDragEndCard}
            />
          ))}
        </AnimatePresence>

        {leads.length === 0 &&
          (accepts ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-8 text-center">
              <CornerDownRight className="size-4 text-[var(--crm-accent)]" strokeWidth={1.75} />
              <span className="text-[12.5px] font-medium text-[var(--crm-accent-strong)]">
                Suelta para {meta.label.toLowerCase()}
              </span>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-8 text-center">
              <Inbox className="size-4 text-[var(--crm-ink-faint)]" strokeWidth={1.75} />
              <span className="text-[12.5px] text-[var(--crm-ink-mute)]">Sin leads</span>
            </div>
          ))}
      </div>
    </div>
  );
}
