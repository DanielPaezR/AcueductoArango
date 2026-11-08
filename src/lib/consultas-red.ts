import "server-only";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db, schema } from "@/db";

const { elementosAcueducto: E, tramosAcueducto: T, viviendas: V, mantenimientos: MT } = schema;

export async function datosMapaRed() {
  const [elementos, tramos, casas] = await Promise.all([
    db.select({ id: E.id, tipo: E.tipo, nombre: E.nombre, lat: E.lat, lng: E.lng, estado: E.estado }).from(E).where(isNull(E.deletedAt)),
    db
      .select({
        id: T.id,
        tipo: T.tipo,
        nombre: T.nombre,
        coordenadas: T.coordenadas,
        estado: T.estado,
        diametroPulg: T.diametroPulg,
        material: T.material,
        longitudM: T.longitudM,
      })
      .from(T)
      .where(isNull(T.deletedAt)),
    db.select({ id: V.id, lat: V.lat, lng: V.lng, codigo: V.codigo }).from(V).where(and(isNull(V.deletedAt), eq(V.usaAcueducto, true))),
  ]);
  return { elementos, tramos, casas };
}

/** Mantenimientos ligados a un punto, una tubería o una casa. */
export async function mantenimientosDe(f: { elementoId?: string; tramoId?: string; viviendaId?: string }) {
  return db
    .select({ id: MT.id, titulo: MT.titulo, tipo: MT.tipo, estado: MT.estado, fechaReporte: MT.fechaReporte, fechaEjecucion: MT.fechaEjecucion })
    .from(MT)
    .where(
      and(
        isNull(MT.deletedAt),
        or(
          f.elementoId ? eq(MT.elementoId, f.elementoId) : undefined,
          f.tramoId ? eq(MT.tramoId, f.tramoId) : undefined,
          f.viviendaId ? eq(MT.viviendaId, f.viviendaId) : undefined,
        ),
      ),
    )
    .orderBy(desc(MT.createdAt));
}

export async function adjuntosDe(entidad: string, id: string) {
  return db
    .select()
    .from(schema.adjuntos)
    .where(and(eq(schema.adjuntos.entidad, entidad), eq(schema.adjuntos.entidadId, id), isNull(schema.adjuntos.deletedAt)))
    .orderBy(schema.adjuntos.createdAt);
}

/** Opciones para elegir punto o tubería en el formulario de arreglos. */
export async function opcionesRed() {
  const { TIPOS_ELEMENTO, TIPOS_TRAMO } = await import("./red");
  const [elementos, tramos] = await Promise.all([
    db.select({ id: E.id, tipo: E.tipo, nombre: E.nombre }).from(E).where(isNull(E.deletedAt)),
    db.select({ id: T.id, tipo: T.tipo, nombre: T.nombre, longitudM: T.longitudM }).from(T).where(isNull(T.deletedAt)),
  ]);
  return {
    elementos: elementos
      .map((e) => ({ id: e.id, label: `${TIPOS_ELEMENTO[e.tipo as keyof typeof TIPOS_ELEMENTO]?.label ?? e.tipo}${e.nombre ? `: ${e.nombre}` : ""}` }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    tramos: tramos
      .map((t) => ({ id: t.id, label: `${t.nombre ?? TIPOS_TRAMO[t.tipo as keyof typeof TIPOS_TRAMO]?.corto ?? t.tipo} (${t.longitudM ?? 0} m)` }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}
