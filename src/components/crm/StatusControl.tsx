"use client";

import { useOptimistic, useTransition } from "react";
import * as RS from "@radix-ui/react-select";
import { ChevronDown, Loader2, Check } from "lucide-react";
import type { LeadStatus } from "@/lib/schema";
import { updateLeadStatus } from "@/app/admin/actions";
import { STATUS_META, STATUS_ORDER } from "./status";

export function StatusControl({
  leadId,
  status,
  editable = true,
  onDark = false,
}: {
  leadId: string;
  status: LeadStatus;
  editable?: boolean;
  onDark?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(status);
  const meta = STATUS_META[optimistic] ?? STATUS_META.new;
  const wrap = onDark
    ? "border-transparent bg-white text-[var(--crm-ink)] shadow-[0_1px_2px_rgba(20,18,14,0.12)]"
    : meta.badge;

  if (!editable) {
    return (
      <span
        className={`inline-flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium sm:w-[170px] ${wrap}`}
      >
        <span className={`size-1.5 shrink-0 rounded-full ${meta.dot}`} />
        {meta.label}
      </span>
    );
  }

  return (
    <RS.Root
      value={optimistic}
      onValueChange={(v) =>
        startTransition(() => {
          setOptimistic(v as LeadStatus);
          updateLeadStatus(leadId, v as LeadStatus);
        })
      }
    >
      <RS.Trigger
        aria-label="Cambiar estado"
        className={`relative inline-flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium outline-none transition-colors focus-visible:shadow-[0_0_0_3px_var(--crm-wine-ring)] sm:w-[170px] ${wrap}`}
      >
        {pending ? (
          <Loader2 className={`size-3.5 shrink-0 animate-spin ${meta.dot.replace("bg-", "text-")}`} strokeWidth={2} />
        ) : (
          <span className={`size-1.5 shrink-0 rounded-full ${meta.dot}`} />
        )}
        <RS.Value />
        <RS.Icon className="ml-auto">
          <ChevronDown className="size-3.5 opacity-60" strokeWidth={2} />
        </RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content
          position="popper"
          sideOffset={6}
          className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-[var(--crm-line)] bg-[var(--crm-surface)] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]"
        >
          <RS.Viewport className="p-1">
            {STATUS_ORDER.map((s) => (
              <RS.Item
                key={s}
                value={s}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-md py-1.5 pl-2.5 pr-8 text-[13px] text-[var(--crm-ink-soft)] outline-none data-[highlighted]:bg-[var(--crm-surface-2)] data-[highlighted]:text-[var(--crm-ink)]"
              >
                <span className={`size-1.5 shrink-0 rounded-full ${STATUS_META[s].dot}`} />
                <RS.ItemText>{STATUS_META[s].label}</RS.ItemText>
                <RS.ItemIndicator className="absolute right-2.5">
                  <Check className="size-3.5 text-[var(--crm-wine)]" />
                </RS.ItemIndicator>
              </RS.Item>
            ))}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  );
}
