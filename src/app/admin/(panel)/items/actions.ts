"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { items } from "@/lib/schema";
import { requireUser } from "@/lib/session";
import { safeParseForm } from "@/lib/validate";

const createSchema = z.object({
  title: z.string().trim().min(1, "Escribe un título.").max(200, "Máximo 200 caracteres."),
});

export async function createItem(
  formData: FormData
): Promise<{ error: string } | void> {
  const me = await requireUser();

  const parsed = safeParseForm(createSchema, formData);
  if (!parsed.ok) return { error: parsed.error };

  await db.insert(items).values({ ownerId: me.id, title: parsed.data.title });
  revalidatePath("/admin/items");
}

const idSchema = z.string().uuid();

export async function deleteItem(id: string): Promise<void> {
  const me = await requireUser();

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return;

  // Ownership server-side: solo borra si el item es del usuario.
  await db
    .delete(items)
    .where(and(eq(items.id, parsed.data), eq(items.ownerId, me.id)));
  revalidatePath("/admin/items");
}
