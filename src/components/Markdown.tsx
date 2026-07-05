import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

// Render de salidas de IA (markdown) con tipografía sobria sobre tokens shadcn.
const components: Components = {
  h1: (p) => <h2 className="mt-5 mb-2 text-base font-semibold" {...p} />,
  h2: (p) => <h2 className="mt-5 mb-2 text-base font-semibold" {...p} />,
  h3: (p) => <h3 className="mt-4 mb-1 text-sm font-semibold" {...p} />,
  p: (p) => <p className="my-2 text-sm leading-6 text-foreground/90" {...p} />,
  ul: (p) => <ul className="my-2 list-disc space-y-1 pl-5 text-sm" {...p} />,
  ol: (p) => <ol className="my-2 list-decimal space-y-1 pl-5 text-sm" {...p} />,
  li: (p) => <li className="leading-6" {...p} />,
  strong: (p) => <strong className="font-semibold text-foreground" {...p} />,
  a: (p) => <a className="text-primary underline underline-offset-2" {...p} />,
  code: (p) => <code className="rounded bg-muted px-1 py-0.5 text-xs" {...p} />,
  blockquote: (p) => (
    <blockquote className="my-2 border-l-2 pl-3 text-sm italic text-muted-foreground" {...p} />
  ),
  hr: () => <hr className="my-4 border-border" />,
};

export function Markdown({ children }: { children: string }) {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
}
