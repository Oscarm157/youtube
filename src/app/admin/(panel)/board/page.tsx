import { redirect } from "next/navigation";
import { getLeads, getUsersBasic } from "@/lib/crm-data";
import { getCurrentUser } from "@/lib/session";
import { BoardView, type BoardLead } from "@/components/crm/BoardView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pipeline", robots: { index: false } };

export default async function BoardPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const viewer = { id: me.id, role: me.role };
  const [{ rows }, usersList] = await Promise.all([
    getLeads(viewer, { pageSize: 500 }),
    getUsersBasic(),
  ]);

  const userMap: Record<string, string> = {};
  for (const u of usersList) userMap[u.id] = u.name;

  const leads: BoardLead[] = rows.map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    source: l.source,
    status: l.status,
    assignedTo: l.assignedTo,
    qualification: l.qualification,
    createdAt: l.createdAt,
  }));

  return <BoardView leads={leads} viewer={viewer} userMap={userMap} />;
}
