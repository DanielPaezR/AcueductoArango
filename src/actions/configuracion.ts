"use server";

import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { auditar } from "@/lib/auditoria";
import { requerirUsuario } from "@/lib/session";

/** Enciende o apaga el módulo del acueducto. Los datos no se borran: solo se ocultan. */
export async function cambiarModuloAcueducto(activo: boolean) {
  const u = await requerirUsuario();
  if (u.rol !== "superadmin") throw new Error("Solo el administrador del sistema puede cambiar esto");
  const valor = { acueducto: activo };
  await db
    .insert(schema.configuracion)
    .values({ clave: "modulos", valor, updatedBy: u.id })
    .onConflictDoUpdate({ target: schema.configuracion.clave, set: { valor, updatedBy: u.id, updatedAt: new Date() } });
  await auditar(u.id, "editar", "configuracion", "modulos", valor);
  revalidatePath("/", "layout");
}
