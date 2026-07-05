import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { articles } from "@/lib/schema";

export type Article = typeof articles.$inferSelect;
export type Locale = "es" | "en";

export function localize(a: Article, locale: Locale) {
  const es = locale === "es";
  return {
    title: es ? a.titleEs : a.titleEn,
    excerpt: es ? a.excerptEs : a.excerptEn,
    body: es ? a.bodyEs : a.bodyEn,
    recommendations: es ? a.recommendationsEs : a.recommendationsEn,
  };
}

// Fecha que ve el lector público: la de publicación (no la de la fuente).
export function fmtArticleDate(a: Article, locale: Locale): string {
  const d = a.publishedAt ?? a.createdAt;
  if (!d) return "";
  return new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(d));
}

// Categorías ya usadas, para el combobox del compositor/editor.
export async function getDistinctCategories(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ category: articles.category })
    .from(articles)
    .where(isNotNull(articles.category))
    .orderBy(asc(articles.category));
  return rows.map((r) => r.category).filter((c): c is string => !!c && c.trim() !== "");
}

export async function getPublishedArticles(): Promise<Article[]> {
  return db.select().from(articles).where(eq(articles.status, "published")).orderBy(desc(articles.publishedAt));
}

export async function getPublishedArticleBySlug(slug: string): Promise<Article | null> {
  const rows = await db
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.status, "published")));
  return rows[0] ?? null;
}

export async function getAllArticles(): Promise<Article[]> {
  return db.select().from(articles).orderBy(desc(articles.updatedAt));
}

export async function getArticleById(id: string): Promise<Article | null> {
  const rows = await db.select().from(articles).where(eq(articles.id, id));
  return rows[0] ?? null;
}
