import "server-only";
import { and, asc, count, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";

const { viviendas: V, personas: P, sectores: S } = schema;

/* Nota: las subconsultas usan "viviendas.id" literal porque Drizzle omite el nombre de la
   tabla en consultas de una sola tabla, y dentro de la subconsulta "id" sería el de personas. */

/** Nombre del jefe de hogar (o de la primera persona registrada) de cada vivienda. */
const jefeSql = sql<string | null>`(
  select trim(p.nombres || ' ' || coalesce(p.apellidos, ''))
  from personas p
  where p.vivienda_id = viviendas.id and p.deleted_at is null
  order by p.es_jefe_hogar desc, p.created_at asc
  limit 1
)`;
const numPersonasSql = sql<number>`(
  select count(*)::int from personas p where p.vivienda_id = viviendas.id and p.deleted_at is null
)`;

export async function listarSectores() {
  return db.select().from(S).orderBy(asc(S.nombre));
}

export async function listarViviendas(f: { q?: string; sector?: number; acueducto?: boolean; pagina: number; porPagina: number }) {
  const conds: (SQL | undefined)[] = [isNull(V.deletedAt)];
  if (f.sector) conds.push(eq(V.sectorId, f.sector));
  if (f.acueducto !== undefined) conds.push(eq(V.usaAcueducto, f.acueducto));
  if (f.q) {
    const like = `%${f.q}%`;
    conds.push(
      or(
        ilike(V.codigo, like),
        ilike(V.referencia, like),
        ilike(V.nombrePredio, like),
        sql`exists (select 1 from personas p where p.vivienda_id = viviendas.id and p.deleted_at is null and (
          (p.nombres || ' ' || coalesce(p.apellidos,'')) ilike ${like} or p.numero_documento ilike ${like}))`,
      ),
    );
  }
  const where = and(...conds);
  const [filas, [{ total }]] = await Promise.all([
    db
      .select({
        id: V.id,
        codigo: V.codigo,
        referencia: V.referencia,
        nombrePredio: V.nombrePredio,
        usaAcueducto: V.usaAcueducto,
        autorizacionDatos: V.autorizacionDatos,
        estado: V.estado,
        sector: S.nombre,
        jefe: jefeSql,
        personas: numPersonasSql,
        fotoPrincipalUrl: V.fotoPrincipalUrl,
      })
      .from(V)
      .leftJoin(S, eq(S.id, V.sectorId))
      .where(where)
      .orderBy(asc(V.codigo))
      .limit(f.porPagina)
      .offset((f.pagina - 1) * f.porPagina),
    db.select({ total: count() }).from(V).where(where),
  ]);
  return { filas, total };
}

export async function puntosMapa() {
  return db
    .select({
      id: V.id,
      codigo: V.codigo,
      lat: V.lat,
      lng: V.lng,
      sectorId: V.sectorId,
      usaAcueducto: V.usaAcueducto,
      estado: V.estado,
      referencia: V.referencia,
      jefe: jefeSql,
      personas: numPersonasSql,
      proyectos: sql<string[]>`coalesce((select array_agg(distinct pa.proyecto_id::text) from participaciones pa
        where pa.vivienda_id = viviendas.id and pa.deleted_at is null), '{}')`,
    })
    .from(V)
    .where(isNull(V.deletedAt));
}

export async function obtenerVivienda(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const v = await db.query.viviendas.findFirst({ where: and(eq(V.id, id), isNull(V.deletedAt)) });
  if (!v) return null;
  const [personas, adjuntos, sector, creador] = await Promise.all([
    db
      .select()
      .from(P)
      .where(and(eq(P.viviendaId, id), isNull(P.deletedAt)))
      .orderBy(sql`${P.esJefeHogar} desc`, asc(P.fechaNacimiento)),
    db
      .select()
      .from(schema.adjuntos)
      .where(and(eq(schema.adjuntos.entidad, "vivienda"), eq(schema.adjuntos.entidadId, id), isNull(schema.adjuntos.deletedAt)))
      .orderBy(asc(schema.adjuntos.createdAt)),
    v.sectorId ? db.query.sectores.findFirst({ where: eq(S.id, v.sectorId) }) : null,
    v.createdBy ? db.query.usuarios.findFirst({ where: eq(schema.usuarios.id, v.createdBy), columns: { nombre: true } }) : null,
  ]);
  return { v, personas, adjuntos, sector, creador };
}

/** Resumen para la pantalla de inicio. */
export async function resumenInicio() {
  const [[t], recientes] = await Promise.all([
    db
      .select({
        viviendas: sql<number>`count(*)::int`,
        conAcueducto: sql<number>`count(*) filter (where ${V.usaAcueducto})::int`,
        conMatricula: sql<number>`count(*) filter (where ${V.tieneMatricula})::int`,
        sinAutorizacion: sql<number>`count(*) filter (where not ${V.autorizacionDatos} and exists (
          select 1 from personas p where p.vivienda_id = viviendas.id and p.deleted_at is null))::int`,
        personas: sql<number>`(select count(*)::int from personas p join viviendas v2 on v2.id = p.vivienda_id
          where p.deleted_at is null and v2.deleted_at is null)`,
        conDiscapacidad: sql<number>`(select count(*)::int from personas p join viviendas v2 on v2.id = p.vivienda_id
          where p.deleted_at is null and v2.deleted_at is null and p.discapacidad)`,
      })
      .from(V)
      .where(isNull(V.deletedAt)),
    db
      .select({
        id: V.id,
        codigo: V.codigo,
        referencia: V.referencia,
        nombrePredio: V.nombrePredio,
        usaAcueducto: V.usaAcueducto,
        autorizacionDatos: V.autorizacionDatos,
        estado: V.estado,
        fotoPrincipalUrl: V.fotoPrincipalUrl,
        jefe: jefeSql,
        personas: numPersonasSql,
      })
      .from(V)
      .where(isNull(V.deletedAt))
      .orderBy(sql`${V.updatedAt} desc`)
      .limit(5),
  ]);
  return { ...t, recientes };
}

/** Viviendas a menos de `metros` de un punto (para detectar casas registradas dos veces). */
export async function viviendasCercanas(lat: number, lng: number, metros = 20, excluir?: string) {
  const d = sql<number>`sqrt(power((${V.lat} - ${lat}) * 110574, 2) + power((${V.lng} - ${lng}) * 111320 * cos(radians(${lat})), 2))`;
  return db
    .select({ id: V.id, codigo: V.codigo, jefe: jefeSql, referencia: V.referencia, distancia: sql<number>`round(${d})::int` })
    .from(V)
    .where(and(isNull(V.deletedAt), sql`${d} < ${metros}`, excluir ? sql`${V.id} <> ${excluir}` : undefined))
    .orderBy(d)
    .limit(5);
}
