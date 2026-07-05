import { and, asc, count, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { leads, leadComments, leadFiles, leadEvents, users, type UserRole } from "./schema";
import { canViewAllLeads } from "./permissions";

export type LeadListOptions = {
  search?: string;
  status?: string;
  owner?: string;
  source?: string;
  sort?: "recent" | "name" | "status";
  unassigned?: boolean;
  page?: number;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 25;

function leadFilters(
  viewer: { id: string; role: UserRole },
  opts: LeadListOptions
): SQL[] {
  const filters: SQL[] = [];

  // Scope de visibilidad: el agente solo ve sus leads asignados.
  if (!canViewAllLeads(viewer.role)) {
    filters.push(eq(leads.assignedTo, viewer.id));
  } else if (opts.unassigned) {
    // "Sin asignar" solo aplica cuando el viewer puede ver todo (admin/viewer).
    filters.push(isNull(leads.assignedTo));
  }

  const search = opts.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    filters.push(
      or(
        ilike(leads.name, pattern),
        ilike(leads.email, pattern),
        ilike(leads.phone, pattern),
        ilike(sql`${leads.qualification}->>'company'`, pattern)
      ) as SQL
    );
  }

  if (opts.status) filters.push(eq(leads.status, opts.status as never));
  if (opts.owner) filters.push(eq(leads.assignedTo, opts.owner));
  if (opts.source) filters.push(eq(leads.source, opts.source as never));

  return filters;
}

export async function getLeads(
  viewer: { id: string; role: UserRole },
  opts: LeadListOptions = {}
) {
  const filters = leadFilters(viewer, opts);
  const where = filters.length ? and(...filters) : undefined;

  const order =
    opts.sort === "name"
      ? asc(leads.name)
      : opts.sort === "status"
        ? asc(leads.status)
        : desc(leads.createdAt);

  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? DEFAULT_PAGE_SIZE);

  const rows = await db
    .select()
    .from(leads)
    .where(where)
    .orderBy(order)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const totalRows = await db.select({ value: count() }).from(leads).where(where);

  return { rows, total: totalRows[0]?.value ?? 0 };
}

export async function getLead(id: string, viewer: { id: string; role: UserRole }) {
  const rows = await db.select().from(leads).where(eq(leads.id, id));
  const lead = rows[0] ?? null;
  if (!lead) return null;
  if (!canViewAllLeads(viewer.role) && lead.assignedTo !== viewer.id) return null;
  return lead;
}

export async function getComments(leadId: string) {
  return db
    .select({
      id: leadComments.id,
      body: leadComments.body,
      createdAt: leadComments.createdAt,
      authorName: users.name,
    })
    .from(leadComments)
    .leftJoin(users, eq(leadComments.userId, users.id))
    .where(eq(leadComments.leadId, leadId))
    .orderBy(desc(leadComments.createdAt));
}

export async function getFiles(leadId: string) {
  return db
    .select()
    .from(leadFiles)
    .where(eq(leadFiles.leadId, leadId))
    .orderBy(asc(leadFiles.createdAt));
}

export async function getEvents(leadId: string) {
  return db
    .select({
      id: leadEvents.id,
      kind: leadEvents.kind,
      detail: leadEvents.detail,
      createdAt: leadEvents.createdAt,
      authorName: users.name,
    })
    .from(leadEvents)
    .leftJoin(users, eq(leadEvents.userId, users.id))
    .where(eq(leadEvents.leadId, leadId))
    .orderBy(desc(leadEvents.createdAt));
}

/** Active users for owner pickers. */
export async function getActiveUsers() {
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.active, true))
    .orderBy(asc(users.name));
}

/** All users (id + name) for resolving owner display names in the list. */
export async function getUsersBasic() {
  return db.select({ id: users.id, name: users.name }).from(users).orderBy(asc(users.name));
}

export async function getUserById(id: string) {
  const rows = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, id));
  return rows[0] ?? null;
}

export async function getAllUsers() {
  return db.select().from(users).orderBy(asc(users.name));
}
