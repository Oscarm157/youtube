"use client";

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

// Vista previa de Markdown con tokens del CRM (dark refinado tipo Cursor).
// Espeja la estructura de site/Markdown.tsx pero con la paleta crm-* en vez de chalk/bone.
const components: Components = {
  h2: ({ children }) => (
    <h2 className="mt-7 text-[19px] font-semibold tracking-[-0.01em] text-[var(--crm-ink)] first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 text-[16px] font-semibold tracking-[-0.01em] text-[var(--crm-ink)]">{children}</h3>
  ),
  p: ({ children }) => <p className="mt-3.5 text-[14px] leading-relaxed text-[var(--crm-ink-soft)] first:mt-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mt-3.5 list-disc space-y-2 pl-5 marker:text-[var(--crm-accent)]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-3.5 list-decimal space-y-2 pl-5 marker:text-[var(--crm-ink-mute)]">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="pl-1 text-[14px] leading-relaxed text-[var(--crm-ink-soft)]">{children}</li>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--crm-accent-strong)] underline underline-offset-2 hover:text-[var(--crm-accent)]"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-[var(--crm-ink)]">{children}</strong>,
  em: ({ children }) => <em className="italic text-[var(--crm-ink-soft)]">{children}</em>,
  code: ({ children }) => (
    <code className="crm-num rounded-[var(--crm-r-sm)] border border-[var(--crm-line)] bg-[var(--crm-surface-2)] px-1.5 py-0.5 text-[12.5px] text-[var(--crm-ink-soft)]">
      {children}
    </code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-2 border-[var(--crm-accent-ring)] pl-4 text-[14px] italic text-[var(--crm-ink-mute)]">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-[var(--crm-line)]" />,
};

export function MarkdownPreview({ children }: { children: string }) {
  const text = children.trim();
  if (!text) {
    return <p className="text-[13px] text-[var(--crm-ink-faint)]">Nada que previsualizar todavía.</p>;
  }
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
}
