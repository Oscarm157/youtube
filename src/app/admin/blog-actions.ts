"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { articles } from "@/lib/schema";
import { requireUser } from "@/lib/session";
import { canManageBlog } from "@/lib/permissions";
import { draftFromSource, type ArticleDraft } from "@/lib/blog/draft";

const MAX_COVER_BYTES = 8 * 1024 * 1024;

async function ensureAdmin() {
  const me = await requireUser();
  if (!canManageBlog(me.role)) throw new Error("forbidden");
  return me;
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const clean =
    base
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80)
      .replace(/^-|-$/g, "") || "nota";
  let slug = clean;
  let n = 1;
  // Evita colisión de slug (único en la tabla).
  while (true) {
    const rows = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug));
    if (!rows.find((r) => r.id !== ignoreId)) return slug;
    slug = `${clean}-${++n}`;
  }
}

export async function draftArticle(formData: FormData) {
  const me = await ensureAdmin();
  const source = String(formData.get("source") ?? "").trim();
  if (!source) redirect("/admin/blog/new?error=empty");
  const sourceName = String(formData.get("sourceName") ?? "").trim() || null;
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const guidance = String(formData.get("guidance") ?? "").trim() || null;
  const coverUrl = String(formData.get("coverUrl") ?? "").trim() || null;
  const coverPathname = String(formData.get("coverPathname") ?? "").trim() || null;

  let d: ArticleDraft;
  try {
    d = await draftFromSource({
      source,
      sourceName: sourceName ?? undefined,
      category: category ?? undefined,
      guidance: guidance ?? undefined,
    });
  } catch {
    redirect("/admin/blog/new?error=draft");
  }
  const slug = await uniqueSlug(d.slug || d.titleEs);
  const rows = await db
    .insert(articles)
    .values({
      slug,
      status: "draft",
      titleEs: d.titleEs,
      titleEn: d.titleEn,
      excerptEs: d.excerptEs || null,
      excerptEn: d.excerptEn || null,
      bodyEs: d.bodyEs || null,
      bodyEn: d.bodyEn || null,
      recommendationsEs: d.recommendationsEs || null,
      recommendationsEn: d.recommendationsEn || null,
      sourceName,
      sourceUrl,
      category,
      coverUrl,
      coverPathname,
      authorId: me.id,
    })
    .returning({ id: articles.id });
  revalidatePath("/admin/blog");
  redirect(`/admin/blog/${rows[0].id}`);
}

export async function updateArticle(id: string, formData: FormData) {
  await ensureAdmin();
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const titleEs = g("titleEs");
  const slug = await uniqueSlug(g("slug") || titleEs, id);
  await db
    .update(articles)
    .set({
      slug,
      titleEs,
      titleEn: g("titleEn"),
      excerptEs: g("excerptEs") || null,
      excerptEn: g("excerptEn") || null,
      bodyEs: g("bodyEs") || null,
      bodyEn: g("bodyEn") || null,
      recommendationsEs: g("recommendationsEs") || null,
      recommendationsEn: g("recommendationsEn") || null,
      category: g("category") || null,
      sourceName: g("sourceName") || null,
      sourceUrl: g("sourceUrl") || null,
      coverUrl: g("coverUrl") || null,
      coverPathname: g("coverPathname") || null,
      featured: formData.get("featured") === "on",
      updatedAt: new Date(),
    })
    .where(eq(articles.id, id));
  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${id}`);
  redirect("/admin/blog");
}

export async function uploadBlogCover(formData: FormData): Promise<{ url: string; pathname: string } | { error: string }> {
  await ensureAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No se recibió la imagen." };
  if (!file.type.startsWith("image/")) return { error: "El archivo debe ser una imagen." };
  if (file.size > MAX_COVER_BYTES) return { error: "La imagen supera 8MB." };
  const blob = await put(`blog/${file.name}`, file, { access: "public", addRandomSuffix: true });
  return { url: blob.url, pathname: blob.pathname };
}

export async function publishArticle(id: string) {
  await ensureAdmin();
  await db
    .update(articles)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(articles.id, id));
  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${id}`);
}

export async function unpublishArticle(id: string) {
  await ensureAdmin();
  await db.update(articles).set({ status: "draft", updatedAt: new Date() }).where(eq(articles.id, id));
  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${id}`);
}

export async function deleteArticle(id: string) {
  await ensureAdmin();
  await db.delete(articles).where(eq(articles.id, id));
  revalidatePath("/admin/blog");
  redirect("/admin/blog");
}
