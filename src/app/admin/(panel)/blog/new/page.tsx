import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canManageBlog } from "@/lib/permissions";
import { getDistinctCategories } from "@/lib/blog/data";
import { PageHeader } from "@/components/crm/PageShell";
import { ArticleComposer } from "@/components/crm/blog/ArticleComposer";

export const dynamic = "force-dynamic";

export default async function NewArticle() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!canManageBlog(me.role)) redirect("/admin");

  const categories = await getDistinctCategories();

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
        title="Nueva nota desde fuente"
        description="Genera un borrador desde PDF, URL o texto. La IA aplica el criterio editorial de BG; la revisión y la publicación son tuyas."
      />

      <ArticleComposer categories={categories} />
    </div>
  );
}
