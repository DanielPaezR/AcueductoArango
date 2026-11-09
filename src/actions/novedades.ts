"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { auditar } from "@/lib/auditoria";
import { hoyBogota } from "@/lib/dinero";
import { requerirPermiso } from "@/lib/session";

const N = schema.novedades;
const ESTADOS = ["pendiente", "en_ejecucion", "realizado"] as const;

function refrescar(id: string) {
  revalidatePath("/novedades");
  revalidatePath(`/novedades/${id}`);
  revalidatePath("/mapa");
}

export async function cambiarEstadoNovedad(id: string, estado: (typeof ESTADOS)[number]) {
  if (!ESTADOS.includes(estado)) throw new Error("Estado inválido");
  const u = await requerirPermiso("novedades", "editar");
  await db
    .update(N)
    .set({ estado, fechaRealizado: estado === "realizado" ? hoyBogota() : null, updatedBy: u.id, updatedAt: new Date() })
    .where(eq(N.id, id));
  await auditar(u.id, "editar", "novedad", id, { estado });
  refrescar(id);
}

/** Archivar saca la novedad del mapa y la deja en el historial; se puede volver a activar. */
export async function archivarNovedad(id: string, archivar: boolean) {
  const u = await requerirPermiso("novedades", "editar");
  await db
    .update(N)
    .set({ archivado: archivar, archivadoEn: archivar ? new Date() : null, updatedBy: u.id, updatedAt: new Date() })
    .where(eq(N.id, id));
  await auditar(u.id, archivar ? "archivar" : "reactivar", "novedad", id);
  refrescar(id);
}

export async function eliminarNovedad(id: string) {
  const u = await requerirPermiso("novedades", "eliminar");
  await db.update(N).set({ deletedAt: new Date() }).where(eq(N.id, id));
  await auditar(u.id, "eliminar", "novedad", id);
  refrescar(id);
  redirect("/novedades");
}
