"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { fmtDate } from "@/lib/crm-format";
import { OwnerChip, SourceBadge } from "./status";
import type { BoardLead } from "./BoardView";

export function BoardCard({
  lead,
  index,
  ownerName,
  draggable,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  lead: BoardLead;
  index: number;
  ownerName: string | null;
  draggable: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const reduce = useReducedMotion();
  const ql = lead.qualification ?? {};
  const interest = ql.service ?? ql.industry ?? null;
  const volume = ql.monthlyVolume ?? null;

  return (
    <motion.div
      layout
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: dragging ? 0.55 : 1, y: 0 }}
      transition={{
        duration: 0.18,
        ease: [0.22, 1, 0.36, 1],
        delay: reduce ? 0 : Math.min(index * 0.025, 0.2),
      }}
      draggable={draggable}
      onDragStart={(e) => {
        // motion forwards the native DragEvent; set payload for the column drop.
        (e as unknown as DragEvent).dataTransfer?.setData("text/plain", lead.id);
        if ((e as unknown as DragEvent).dataTransfer) {
          (e as unknown as DragEvent).dataTransfer!.effectAllowed = "move";
        }
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`group relative rounded-xl border p-3 transition-[background-color,border-color,box-shadow] duration-150 ${
        dragging
          ? "border-[var(--crm-accent-ring)] bg-[var(--crm-surface-3)] shadow-[0_0_0_1px_var(--crm-accent-ring),0_16px_32px_-18px_rgba(0,0,0,0.85)]"
          : "border-[var(--crm-line)] bg-[var(--crm-surface-2)]"
      } ${
        draggable
          ? "cursor-grab active:cursor-grabbing hover:border-[var(--crm-line-strong)] hover:bg-[var(--crm-surface-3)]"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/admin/${lead.id}`}
          draggable={false}
          className="text-[14.5px] font-semibold leading-tight text-[var(--crm-ink)] transition-colors hover:text-[var(--crm-accent-strong)] before:absolute before:inset-0 before:content-['']"
        >
          {lead.name ?? "Sin nombre"}
        </Link>
        <SourceBadge source={lead.source} />
      </div>

      {(lead.email || lead.phone) && (
        <div className="mt-1.5 flex flex-col gap-0.5 text-[13px] leading-tight text-[var(--crm-ink-soft)]">
          {lead.email && <span className="truncate">{lead.email}</span>}
          {lead.phone && <span className="crm-num">{lead.phone}</span>}
        </div>
      )}

      {(interest || volume) && (
        <div className="relative z-[1] mt-2.5 flex flex-wrap gap-1.5">
          {interest && (
            <span className="rounded-md border border-[var(--crm-line)] bg-[var(--crm-surface)] px-1.5 py-0.5 text-[12px] text-[var(--crm-ink-soft)]">
              {interest}
            </span>
          )}
          {volume && (
            <span className="crm-num inline-flex items-center gap-1 rounded-md border border-[var(--crm-accent-ring)] bg-[var(--crm-accent-tint)] px-1.5 py-0.5 text-[12px] font-medium text-[var(--crm-accent-strong)]">
              {volume}
            </span>
          )}
        </div>
      )}

      <div className="relative z-[1] mt-3 flex items-center justify-between gap-2 border-t border-[var(--crm-line)] pt-2.5">
        {ownerName ? (
          <OwnerChip name={ownerName} id={lead.assignedTo ?? ownerName} />
        ) : (
          <span className="text-[12px] text-[var(--crm-ink-mute)]">Sin asignar</span>
        )}
        <span className="crm-num text-[12px] text-[var(--crm-ink-mute)]">{fmtDate(lead.createdAt)}</span>
      </div>
    </motion.div>
  );
}
