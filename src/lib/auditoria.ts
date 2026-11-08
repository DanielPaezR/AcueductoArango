import "server-only";
import { db, schema } from "@/db";

export async function auditar(
  usuarioId: string | null,
  accion: string,
  entidad: string,
  entidadId?: string | null,
  datos?: unknown,
) {
  await db.insert(schema.auditoria).values({
    usuarioId,
    accion,
    entidad,
    entidadId: entidadId ?? null,
    datos: datos ?? null,
  });
}
