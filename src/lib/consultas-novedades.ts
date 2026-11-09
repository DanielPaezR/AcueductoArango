import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";

const N = schema.novedades;

export async function listarNovedades(archivadas: boolean) {
  return db
    .select({
      id: N.id,
      titulo: N.titulo,
      descripcion: N.descripcion,
      categoria: N.categoria,
      estado: N.estado,
      lat: N.lat,
      lng: N.lng,
      fechaRealizado: N.fechaRealizado,
      archivadoEn: N.archivadoEn,
      createdAt: N.createdAt,
      autor: schema.usuarios.nombre,
    })
    .from(N)
    .leftJoin(schema.usuarios, eq(schema.usuarios.id, N.createdBy))
    .where(and(isNull(N.deletedAt), eq(N.archivado, archivadas)))
    .orderBy(archivadas ? desc(N.archivadoEn) : desc(N.createdAt));
}

/** Puntos de novedades activas para mostrarlos en el mapa de la vereda. */
export async function puntosNovedades() {
  const xs = await listarNovedades(false);
  return xs.filter((x) => x.lat !== null && x.lng !== null).map((x) => ({ id: x.id, titulo: x.titulo, categoria: x.categoria, estado: x.estado, lat: x.lat!, lng: x.lng! }));
}
