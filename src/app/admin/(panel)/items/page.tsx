import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { items } from "@/lib/schema";
import { requireUser } from "@/lib/session";
import { Empty } from "@/components/states";
import { Card } from "@/components/ui/card";
import { ItemForm } from "./item-form";
import { DeleteButton } from "./delete-button";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const me = await requireUser();

  const rows = await db
    .select()
    .from(items)
    .where(eq(items.ownerId, me.id))
    .orderBy(desc(items.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Items</h1>
        <p className="text-sm text-muted-foreground">Solo ves los tuyos.</p>
      </div>

      <ItemForm />

      {rows.length === 0 ? (
        <Empty
          title="Aún no tienes items"
          hint="Crea el primero con el campo de arriba."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((item) => (
            <li key={item.id}>
              <Card className="flex flex-row items-center justify-between gap-3 px-4 py-3">
                <span className="truncate text-sm">{item.title}</span>
                <DeleteButton id={item.id} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
