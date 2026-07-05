import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leadFiles, leads } from "@/lib/schema";
import { getCurrentUser } from "@/lib/session";
import { canViewAllLeads } from "@/lib/permissions";

export const runtime = "nodejs";

// Only these content-types may render inline. Anything else (HTML, SVG, etc.) is
// forced to download so a malicious upload can't execute in the CRM's origin.
const INLINE_SAFE = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
]);

// Serves a lead file only to a signed-in CRM user. The underlying blob URL is
// never exposed to the client; we fetch it server-side and stream it back.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const rows = await db.select().from(leadFiles).where(eq(leadFiles.id, id));
  const f = rows[0];
  if (!f) return new Response("Not found", { status: 404 });

  // Scope: admin/viewer ven todo; el agente solo archivos de leads asignados.
  const leadRows = await db
    .select({ assignedTo: leads.assignedTo })
    .from(leads)
    .where(eq(leads.id, f.leadId));
  const lead = leadRows[0];
  if (!lead || (!canViewAllLeads(me.role) && lead.assignedTo !== me.id)) {
    return new Response("Forbidden", { status: 403 });
  }

  const upstream = await fetch(f.url);
  if (!upstream.ok || !upstream.body) return new Response("Not found", { status: 404 });

  // The stored content-type came from the client at upload, so it isn't trusted.
  const type = f.contentType || "application/octet-stream";
  const dl = req.nextUrl.searchParams.get("dl");
  const inline = !dl && INLINE_SAFE.has(type);
  const safeName = f.name.replace(/[^\w.\- ]/g, "_");
  const headers = new Headers();
  headers.set("Content-Type", inline ? type : "application/octet-stream");
  headers.set("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${safeName}"`);
  // Defense in depth: even an inline file is sandboxed with no scripting.
  headers.set(
    "Content-Security-Policy",
    "sandbox; default-src 'none'; img-src 'self' data:; object-src 'self'; style-src 'unsafe-inline'"
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "private, no-store");
  return new Response(upstream.body, { headers });
}
