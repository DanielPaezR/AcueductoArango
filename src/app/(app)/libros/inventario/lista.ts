import "server-only";
import { asc, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export async function listarInventario() {
  const I = schema.inventario;
  return db
    .select({
      id: I.id,
      codigo: I.codigo,
      nombre: I.nombre,
      descripcion: I.descripcion,
      cantidad: I.cantidad,
      estado: I.estado,
      ubicacion: I.ubicacion,
      fechaAdquisicion: I.fechaAdquisicion,
      valor: I.valor,
      procedencia: I.procedencia,
      fotos: sql<number>`(select count(*)::int from adjuntos x where x.entidad = 'inventario' and x.entidad_id = inventario.id and x.deleted_at is null)`,
    })
    .from(I)
    .where(isNull(I.deletedAt))
    .orderBy(sql`case when ${I.estado} = 'dado_de_baja' then 1 else 0 end`, asc(I.nombre));
}
