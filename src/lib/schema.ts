import { pgTable, uuid, text, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export type UserRole = "admin" | "agent" | "viewer";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<UserRole>().default("agent").notNull(),
  active: boolean("active").default(true).notNull(),
  mustChangePassword: boolean("must_change_password").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type User = typeof users.$inferSelect;

// ===== CRM core (leads + pipeline + audit + archivos) =====
// Borra este bloque y las rutas /admin si el proyecto no lleva CRM (tier Landing).

export type LeadQualification = {
  service?: string;
  company?: string;
  industry?: string;
  monthlyVolume?: string;
  paymentTerms?: string;
  timeInBusiness?: string;
  urgency?: string;
};

export type TranscriptMessage = { role: string; content: string };

export type LeadSource = "bot" | "form" | "manual";

export type LeadStatus =
  | "new"
  | "contacted"
  | "following_up"
  | "proposal"
  | "won"
  | "lost";

export type ArticleStatus = "draft" | "scheduled" | "published";

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  locale: text("locale").default("es"),
  sourceUrl: text("source_url"),
  qualification: jsonb("qualification").$type<LeadQualification>(),
  // Transcript completo del chat (si viene de bot); el CRM muestra el summary, no esto.
  transcript: jsonb("transcript").$type<TranscriptMessage[]>(),
  summary: text("summary"),
  source: text("source").$type<LeadSource>().default("form").notNull(),
  status: text("status").$type<LeadStatus>().default("new").notNull(),
  utmSource: text("utm_source"),
  utmCampaign: text("utm_campaign"),
  utmMedium: text("utm_medium"),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  valueAmount: integer("value_amount"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const leadComments = pgTable("lead_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const leadEvents = pgTable("lead_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  kind: text("kind").notNull(),
  detail: text("detail").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const leadFiles = pgTable("lead_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  pathname: text("pathname").notNull(),
  contentType: text("content_type"),
  size: integer("size"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Blog / noticias — bilingüe (es/en). Cuerpo en Markdown. Módulo opcional.
export const articles = pgTable("articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  status: text("status").$type<ArticleStatus>().default("draft").notNull(),
  titleEs: text("title_es").notNull(),
  titleEn: text("title_en").notNull(),
  excerptEs: text("excerpt_es"),
  excerptEn: text("excerpt_en"),
  bodyEs: text("body_es"),
  bodyEn: text("body_en"),
  recommendationsEs: text("recommendations_es"),
  recommendationsEn: text("recommendations_en"),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  sourceDate: text("source_date"),
  category: text("category"),
  coverUrl: text("cover_url"),
  coverPathname: text("cover_pathname"),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  featured: boolean("featured").default(false).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ===== Plantilla de módulo de dominio (capa 3, bespoke por cliente) =====
// `items` demuestra el patrón CRUD + estados. Renómbrala/duplícala para tu entidad
// real (propiedades, productos, servicios) o bórrala si no la usas.
export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Item = typeof items.$inferSelect;

// ===== Analizador de YouTube =====
// Datos que la IA extrae del transcript, tipados para render directo en la UI.
export type Extraccion = {
  cifras: string[];
  nombres: string[];
  herramientas: string[];
  pasos: string[];
  citas: string[];
};

export type AnalysisResult = {
  resumen: string; // markdown
  extraccion: Extraccion;
  repurposing: string; // markdown
  critico: string; // markdown
};

export const analyses = pgTable("analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  videoId: text("video_id"),
  title: text("title"),
  lang: text("lang"),
  source: text("source"), // captions | generate
  transcript: text("transcript").notNull(),
  results: jsonb("results").$type<AnalysisResult>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Analysis = typeof analyses.$inferSelect;
