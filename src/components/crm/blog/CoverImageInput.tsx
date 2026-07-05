"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { uploadBlogCover } from "@/app/admin/blog-actions";

interface Props {
  defaultUrl?: string;
  defaultPathname?: string;
}

type Tab = "upload" | "url";

export function CoverImageInput({ defaultUrl = "", defaultPathname = "" }: Props) {
  const [tab, setTab] = useState<Tab>(defaultUrl && !defaultPathname ? "url" : "upload");
  const [url, setUrl] = useState(defaultUrl);
  const [pathname, setPathname] = useState(defaultPathname);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();

  const upload = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadBlogCover(fd);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setUrl(res.url);
      setPathname(res.pathname);
    } finally {
      setUploading(false);
    }
  };

  const clear = () => {
    setUrl("");
    setPathname("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const hasPreview = url.length > 0;

  return (
    <div>
      <input type="hidden" name="coverUrl" value={url} />
      <input type="hidden" name="coverPathname" value={pathname} />

      <div className="mb-3 inline-flex items-center gap-0.5 rounded-[var(--crm-r-md)] border border-[var(--crm-line)] bg-[var(--crm-surface-2)] p-0.5">
        {(["upload", "url"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`rounded-[var(--crm-r-sm)] px-2.5 py-1 text-[12px] font-medium transition-colors ${
              tab === t
                ? "bg-[var(--crm-surface-3)] text-[var(--crm-ink)]"
                : "text-[var(--crm-ink-mute)] hover:text-[var(--crm-ink-soft)]"
            }`}
          >
            {t === "upload" ? "Subir" : "URL"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "upload" ? (
          <motion.div
            key="upload"
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
          >
            {hasPreview ? (
              <div className="flex items-center gap-3 rounded-[var(--crm-r-md)] border border-[var(--crm-line)] bg-[var(--crm-surface)] p-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Portada" className="h-14 w-20 shrink-0 rounded-[var(--crm-r-sm)] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] text-[var(--crm-ink-soft)]">{pathname || url}</p>
                  <button
                    type="button"
                    onClick={clear}
                    className="mt-1 text-[12px] font-medium text-[var(--crm-accent-strong)] transition-colors hover:text-[var(--crm-accent)]"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) upload(f);
                }}
                onClick={() => !uploading && inputRef.current?.click()}
                data-accepts="true"
                data-over={dragOver || undefined}
                className="crm-dropzone flex min-h-[96px] cursor-pointer flex-col items-center justify-center p-4 text-center"
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
                />
                {uploading ? (
                  <span className="flex items-center gap-2 text-[12.5px] text-[var(--crm-ink-soft)]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="animate-spin"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" strokeOpacity="0.3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                    Subiendo…
                  </span>
                ) : (
                  <>
                    <p className="text-[12.5px] font-medium text-[var(--crm-ink-soft)]">Arrastra una imagen o haz clic</p>
                    <p className="mt-1 text-[11.5px] text-[var(--crm-ink-mute)]">JPG, PNG o WebP</p>
                  </>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="url"
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
          >
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setPathname(""); }}
              placeholder="https://…"
              className="crm-input"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="mt-2 text-[12px] text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
