import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, schema } from "@/db";

export type Modulos = { acueducto: boolean };
const POR_DEFECTO: Modulos = { acueducto: true };

/** Módulos activos de esta instalación (una Junta puede no manejar acueducto). */
export const modulos = cache(async (): Promise<Modulos> => {
  const fila = await db.query.configuracion.findFirst({ where: eq(schema.configuracion.clave, "modulos") });
  return { ...POR_DEFECTO, ...((fila?.valor as Partial<Modulos>) ?? {}) };
});

/** Para páginas de un módulo: si está apagado, se va al inicio. */
export async function requerirModulo(m: keyof Modulos) {
  if (!(await modulos())[m]) redirect("/");
}
