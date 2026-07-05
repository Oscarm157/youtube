import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, leads, type User, type UserRole } from "./schema";
import { SESSION_COOKIE, verifySession } from "./auth";
import { canEditLead } from "./permissions";

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const uid = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!uid) return null;
  const rows = await db.select().from(users).where(eq(users.id, uid));
  const u = rows[0];
  if (!u || !u.active) return null;
  return u;
}

/** Usar al inicio de toda página/action protegida. Redirige a /login si no hay sesión. */
export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

/** Exige uno de los roles. Redirige a / si no cumple. */
export async function requireRole(...roles: UserRole[]): Promise<User> {
  const u = await requireUser();
  if (!roles.includes(u.role)) redirect("/");
  return u;
}

/** Exige rol admin. Redirige a / si no cumple. */
export async function requireAdmin(): Promise<User> {
  return requireRole("admin");
}

/**
 * Carga el lead y garantiza que el usuario actual pueda editarlo.
 * Redirige a /login si no hay sesión y a /admin si no tiene alcance sobre el lead.
 */
export async function requireLeadAccess(leadId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const rows = await db
    .select({ id: leads.id, assignedTo: leads.assignedTo })
    .from(leads)
    .where(eq(leads.id, leadId));
  const lead = rows[0];
  if (!lead || !canEditLead(user, lead)) redirect("/admin");
  return { user, lead };
}
