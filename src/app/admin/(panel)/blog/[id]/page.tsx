import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canManageBlog } from "@/lib/permissions";
import { getArticleById, getDistinctCategories } from "@/lib/blog/data";
import { updateArticle, publishArticle, unpublishArticle, deleteArticle } from "@/app/admin/blog-actions";
import { PageHeader } from "@/components/crm/PageShell";
import { ArticleEditor } from "@/components/crm/blog/ArticleEditor";
import { DeleteArticleButton } from "@/components/crm/blog/DeleteArticleButton";

export const dynamic = "force-dynamic";

export default async function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!canManageBlog(me.role)) redirect("/admin");

  const { id } = await params;
  const a = await getArticleById(id);
  if (!a) notFound();

  const categories = await getDistinctCategories();

  const save = updateArticle.bind(null, a.id);
  const publish = publishArticle.bind(null, a.id);
  const unpublish = unpublishArticle.bind(null, a.id);
  const remove = deleteArticle.bind(null, a.id);
  const isPublished = a.status === "published";

  return (
    <div className="crm-fade mx-auto max-w-[1100px] px-4 py-8 sm:px-7">
      <Link
        href="/admin/blog"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[var(--crm-ink-mute)] transition-colors hover:text-[var(--crm-ink)]"
      >
        <span aria-hidden>&larr;</span> Blog
      </Link>

      <PageHeader
        eyebrow="Contenido / Blog"
        title={a.titleEs || "Nota sin título"}
        actions={
          <>
            {isPublished && (
              <Link
                href={`/es/blog/${a.slug}`}
                target="_blank"
                className="crm-btn crm-btn-ghost crm-btn-sm"
              >
                Ver publicada <span aria-hidden>↗</span>
              </Link>
            )}
            <form action={isPublished ? unpublish : publish}>
              <button className="crm-btn crm-btn-secondary crm-btn-sm">
                {isPublished ? "Despublicar" : "Publicar"}
              </button>
            </form>
            <DeleteArticleButton action={remove} />
          </>
        }
      >
        <div className="mt-2.5">
          <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${
              isPublished
                ? "border-[var(--crm-accent-ring)] bg-[var(--crm-accent-tint)] text-[var(--crm-accent-strong)]"
                : "border-[var(--crm-line-strong)] bg-[var(--crm-surface-2)] text-[var(--crm-ink-mute)]"
            }`}
          >
            <span className={`size-1.5 rounded-full ${isPublished ? "bg-[var(--crm-accent)]" : "bg-[var(--crm-ink-faint)]"}`} />
            {isPublished ? "Publicada" : "Borrador"}
          </span>
        </div>
      </PageHeader>

      <ArticleEditor action={save} article={a} categories={categories} />
    </div>
  );
}
