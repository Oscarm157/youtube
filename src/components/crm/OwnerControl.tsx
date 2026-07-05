"use client";

import { useOptimistic, useTransition } from "react";
import * as RS from "@radix-ui/react-select";
import { ChevronDown, UserCircle2, Loader2, Check } from "lucide-react";
import type { UserRole } from "@/lib/schema";
import { canEditAnyLead } from "@/lib/permissions";
import { assignLead } from "@/app/admin/actions";

type U = { id: string; name: string };

// "none" = centinela para "Sin asignar" (Radix Select no admite value vacío).
const NONE = "none";

export function OwnerControl({
  leadId,
  assignedTo,
  users,
  viewerRole,
  ownerName,
}: {
  leadId: string;
  assignedTo: string | null;
  users: U[];
  viewerRole: UserRole;
  ownerName: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(assignedTo ?? NONE);

  // Only admins can reassign. Everyone else sees the owner as plain text.
  if (!canEditAnyLead(viewerRole)) {
    return (
      <span className="inline-flex w-full items-center gap-2 rounded-lg border border-[var(--crm-line)] bg-[var(--crm-surface-2)] px-3 py-2 text-[13px] text-[var(--crm-ink)] sm:w-[170px]">
        <UserCircle2 className="size-3.5 shrink-0 text-[var(--crm-ink-mute)]" strokeWidth={1.75} />
        <span className="truncate">{ownerName ?? "Sin asignar"}</span>
      </span>
    );
  }

  return (
    <RS.Root
      value={optimistic}
      onValueChange={(v) =>
        startTransition(() => {
          setOptimistic(v);
          assignLead(leadId, v === NONE ? null : v);
        })
      }
    >
      <RS.Trigger
        aria-label="Asignar responsable"
        className="relative inline-flex w-full items-center gap-2 rounded-lg border border-[var(--crm-line-strong)] bg-[var(--crm-surface)] px-3 py-2 text-[13px] text-[var(--crm-ink)] outline-none transition-colors hover:border-[var(--crm-ink-mute)] focus-visible:border-[var(--crm-wine-soft)] focus-visible:shadow-[0_0_0_3px_var(--crm-wine-ring)] sm:w-[170px]"
      >
        {pending ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--crm-ink-mute)]" strokeWidth={2} />
        ) : (
          <UserCircle2 className="size-3.5 shrink-0 text-[var(--crm-ink-mute)]" strokeWidth={1.75} />
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
          className="z-50 max-h-[300px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-[var(--crm-line)] bg-[var(--crm-surface)] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]"
        >
          <RS.Viewport className="p-1">
            <RS.Item
              value={NONE}
              className="relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-2.5 pr-8 text-[13px] text-[var(--crm-ink-mute)] outline-none data-[highlighted]:bg-[var(--crm-surface-2)] data-[highlighted]:text-[var(--crm-ink)]"
            >
              <RS.ItemText>Sin asignar</RS.ItemText>
              <RS.ItemIndicator className="absolute right-2.5">
                <Check className="size-3.5 text-[var(--crm-wine)]" />
              </RS.ItemIndicator>
            </RS.Item>
            {users.map((u) => (
              <RS.Item
                key={u.id}
                value={u.id}
                className="relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-2.5 pr-8 text-[13px] text-[var(--crm-ink-soft)] outline-none data-[highlighted]:bg-[var(--crm-surface-2)] data-[highlighted]:text-[var(--crm-ink)]"
              >
                <RS.ItemText>{u.name}</RS.ItemText>
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
