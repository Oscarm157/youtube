"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

interface Props {
  name?: string;
  defaultValue?: string;
  categories: string[];
}

export function CategoryCombobox({ name = "category", defaultValue = "", categories }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const reduce = useReducedMotion();

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    const base = q ? categories.filter((c) => c.toLowerCase().includes(q)) : categories;
    return base.slice(0, 8);
  }, [value, categories]);

  const exact = categories.some((c) => c.toLowerCase() === value.trim().toLowerCase());
  const canCreate = value.trim().length > 0 && !exact;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (v: string) => {
    setValue(v);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && active >= 0 && matches[active]) {
        e.preventDefault();
        choose(matches[active]);
      } else if (open && canCreate) {
        e.preventDefault();
        choose(value.trim());
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <input
        type="text"
        value={value}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Aduanas, Fiscal, Logística…"
        className="crm-input"
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      <AnimatePresence>
        {open && (matches.length > 0 || canCreate) && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute z-20 mt-1.5 max-h-60 w-full overflow-auto rounded-[var(--crm-r-md)] border border-[var(--crm-line-strong)] bg-[var(--crm-surface-2)] p-1 shadow-lg"
          >
            {matches.map((c, i) => (
              <li key={c} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(c)}
                  className={`flex w-full items-center justify-between rounded-[var(--crm-r-sm)] px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                    i === active
                      ? "bg-[var(--crm-surface-3)] text-[var(--crm-ink)]"
                      : "text-[var(--crm-ink-soft)]"
                  }`}
                >
                  {c}
                </button>
              </li>
            ))}
            {canCreate && (
              <li role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => choose(value.trim())}
                  className="flex w-full items-center gap-2 rounded-[var(--crm-r-sm)] px-2.5 py-1.5 text-left text-[13px] text-[var(--crm-accent-strong)] transition-colors hover:bg-[var(--crm-surface-3)]"
                >
                  <span aria-hidden className="text-[15px] leading-none">+</span>
                  Crear «{value.trim()}»
                </button>
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
