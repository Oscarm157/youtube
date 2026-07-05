import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canManageBlog } from "@/lib/permissions";
import { getAllArticles } from "@/lib/blog/data";
import { fmtDate } from "@/lib/crm-format";
import { PageHeader } from "@/components/crm/PageShell";
import { BlogIndex, type BlogRow } from "@/components/crm/blog/BlogIndex";

export const dynamic = "force-dynamic";

export default async function AdminBlog() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!canManageBlog(me.role)) redirect("/admin");

  const articles = await getAllArticles();

  const rows: BlogRow[] = articles.map((a) => ({
    id: a.id,
    titleEs: a.titleEs,
    titleEn: a.titleEn,
    excerptEs: a.excerptEs,
    category: a.category,
    status: a.status,
    featured: a.featured,
    coverUrl: a.coverUrl,
    sourceName: a.sourceName,
    updatedLabel: a.updatedAt ? fmtDate(a.updatedAt) : "·",
  }));

  return (
    <div className="crm-fade mx-auto max-w-[1280px] px-4 py-8 sm:px-7">
      <PageHeader
        eyebrow="Contenido"
        title="Blog"
        description="Notas del blog público, redactadas con asistencia de IA y revisadas antes de publicar."
      />

      {rows.length === 0 ? (
        <div className="crm-empty px-6 py-20">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="mb-4 size-9 text-[var(--crm-ink-faint)]"
            aria-hidden
          >
            <path
              d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5V20l-2-1.4L12 20l-2-1.4L8 20l-2-1.4L4 20V5.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M7 8h6M7 11h6M7 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-[14px] font-medium text-[var(--crm-ink)]">Aún no hay notas</p>
          <p className="mt-1 max-w-xs text-[13px] text-[var(--crm-ink-mute)]">
            Pega una fuente y la IA redacta el primer borrador en español e inglés.
          </p>
          <Link href="/admin/blog/new" className="crm-btn crm-btn-secondary crm-btn-sm mt-5">
            Crear la primera
          </Link>
        </div>
      ) : (
        <BlogIndex articles={rows} />
      )}
    </div>
  );
}
