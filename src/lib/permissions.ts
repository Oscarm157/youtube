import type { UserRole } from "./schema";

// Roles: admin (todo), agent (opera sus leads asignados), viewer (solo lectura).
// Cualquier rol desconocido (datos viejos) se trata como "agent".
export function normalizeRole(role: string): UserRole {
  return role === "admin" || role === "viewer" ? role : "agent";
}

export const isAdmin = (r: UserRole) => r === "admin";
export const canWrite = (r: UserRole) => r === "admin" || r === "agent";
export const isReadOnly = (r: UserRole) => r === "viewer";

// ===== Alcance del CRM =====
export function canViewAllLeads(role: UserRole): boolean {
  return role === "admin" || role === "viewer";
}

export function canEditAnyLead(role: UserRole): boolean {
  return role === "admin";
}

export function canEditLead(
  user: { id: string; role: UserRole },
  lead: { assignedTo: string | null }
): boolean {
  if (user.role === "admin") return true;
  if (user.role === "agent") return lead.assignedTo === user.id;
  return false;
}

export function canViewDashboard(role: UserRole): boolean {
  return role === "admin" || role === "viewer";
}

export function canManageUsers(role: UserRole): boolean {
  return role === "admin";
}

export function canManageBlog(role: UserRole): boolean {
  return role === "admin";
}
