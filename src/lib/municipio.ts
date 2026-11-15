import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { GRUPOS_EDAD, type GrupoEdad } from "./opciones";

/**
 * Consultas de la alcaldía. Corren con alcance "municipio": la base de datos devuelve las filas de todas
 * las veredas. Los nombres y documentos de una familia solo se muestran si su autorización incluye a la
 * alcaldía (viviendas.autoriza_alcaldia); el resto cuenta únicamente en las cifras.
 */

/** Edad actual en SQL (misma regla que `edadPersona`: fecha de nacimiento o edad reportada + años desde la visita). */
const EDAD = sql.raw(`coalesce(
  date_part('year', age(current_date, p.fecha_nacimiento))::int,
  p.edad_reportada + coalesce(date_part('year', age(current_date, p.edad_reportada_en))::int, 0)
)`);

/** Grupo de edad en SQL, con los mismos cortes de GRUPOS_EDAD. */
const GRUPO = sql.raw(
  `case ${GRUPOS_EDAD.map((g) => `when e.edad between ${g.min} and ${g.max} then '${g.id}'`).join(" ")} else null end`,
);

export type FilaVereda = {
  id: number;
  nombre: string;
  slug: string;
  activa: boolean;
  meta: number;
  viviendas: number;
  hogares: number;
  habitantes: number;
  pendientes: number;
  con_discapacidad: number;
  mayores: number;
  menores: number;
  sin_edad: number;
  autorizadas_alcaldia: number;
  con_acueducto: number;
  novedades_activas: number;
  obras_realizadas_anio: number;
  saldo_junta: number;
  ingresos_anio: number;
  egresos_anio: number;
  actas_anio: number;
  ultima_asamblea: string | null;
  ayudas_anio: number;
  usuarios: number;
  presidencia: string | null;
  ultima_visita: string | null;
};

/** Una fila por vereda con todos sus indicadores. */
export async function indicadoresPorVereda(): Promise<FilaVereda[]> {
  const { rows } = await db.execute<FilaVereda>(sql`
    with per as (
      select p.vereda_id, ${EDAD} as edad, p.discapacidad
      from personas p join viviendas v on v.id = p.vivienda_id and v.deleted_at is null
      where p.deleted_at is null
    )
    select ve.id, ve.nombre, ve.slug, ve.activa, ve.meta_viviendas::int as meta,
      (select count(*) from viviendas v where v.vereda_id = ve.id and v.deleted_at is null)::int as viviendas,
      (select count(*) from viviendas v where v.vereda_id = ve.id and v.deleted_at is null
        and exists (select 1 from personas p where p.vivienda_id = v.id and p.deleted_at is null))::int as hogares,
      (select count(*) from per where per.vereda_id = ve.id)::int as habitantes,
      (select count(*) from viviendas v where v.vereda_id = ve.id and v.deleted_at is null and v.info_pendiente)::int as pendientes,
      (select count(*) from per where per.vereda_id = ve.id and per.discapacidad)::int as con_discapacidad,
      (select count(*) from per where per.vereda_id = ve.id and per.edad >= 60)::int as mayores,
      (select count(*) from per where per.vereda_id = ve.id and per.edad < 18)::int as menores,
      (select count(*) from per where per.vereda_id = ve.id and per.edad is null)::int as sin_edad,
      (select count(*) from viviendas v where v.vereda_id = ve.id and v.deleted_at is null and v.autoriza_alcaldia)::int as autorizadas_alcaldia,
      (select count(*) from viviendas v where v.vereda_id = ve.id and v.deleted_at is null and v.usa_acueducto)::int as con_acueducto,
      (select count(*) from novedades n where n.vereda_id = ve.id and n.deleted_at is null and not n.archivado and n.estado <> 'realizado')::int as novedades_activas,
      (select count(*) from novedades n where n.vereda_id = ve.id and n.deleted_at is null and n.estado = 'realizado'
        and extract(year from n.fecha_realizado) = extract(year from current_date))::int as obras_realizadas_anio,
      (coalesce((select sum(c.saldo_inicial) from cuentas c where c.vereda_id = ve.id and c.fondo = 'junta'), 0)
        + coalesce((select sum(case when m.tipo = 'ingreso' then m.valor else -m.valor end) from movimientos m
            join cuentas c on c.id = m.cuenta_id where c.vereda_id = ve.id and c.fondo = 'junta' and m.estado = 'aprobado'), 0))::float as saldo_junta,
      coalesce((select sum(m.valor) from movimientos m join cuentas c on c.id = m.cuenta_id where c.vereda_id = ve.id and c.fondo = 'junta'
        and m.estado = 'aprobado' and m.tipo = 'ingreso' and extract(year from m.fecha) = extract(year from current_date)), 0)::float as ingresos_anio,
      coalesce((select sum(m.valor) from movimientos m join cuentas c on c.id = m.cuenta_id where c.vereda_id = ve.id and c.fondo = 'junta'
        and m.estado = 'aprobado' and m.tipo = 'egreso' and extract(year from m.fecha) = extract(year from current_date)), 0)::float as egresos_anio,
      (select count(*) from actas a where a.vereda_id = ve.id and a.deleted_at is null and extract(year from a.fecha) = extract(year from current_date))::int as actas_anio,
      (select max(a.fecha)::text from actas a where a.vereda_id = ve.id and a.deleted_at is null and a.tipo in ('asamblea', 'asamblea_extraordinaria')) as ultima_asamblea,
      (select count(distinct pa.vivienda_id) from participaciones pa where pa.vereda_id = ve.id and pa.deleted_at is null
        and extract(year from coalesce(pa.fecha, pa.created_at::date)) = extract(year from current_date))::int as ayudas_anio,
      (select count(*) from usuarios u where u.vereda_id = ve.id and u.activo)::int as usuarios,
      (select string_agg(u.nombre, ', ') from usuarios u where u.vereda_id = ve.id and u.activo and u.rol = 'admin') as presidencia,
      (select max(v.updated_at)::date::text from viviendas v where v.vereda_id = ve.id and v.deleted_at is null) as ultima_visita
    from veredas ve
    order by ve.nombre`);
  return rows.map((r) => ({ ...r, saldo_junta: Number(r.saldo_junta), ingresos_anio: Number(r.ingresos_anio), egresos_anio: Number(r.egresos_anio) }));
}

/** Personas por grupo de edad, en total y por vereda. */
export async function gruposPorVereda() {
  const { rows } = await db.execute<{ vereda_id: number; grupo: GrupoEdad | null; n: number; disc: number }>(sql`
    select e.vereda_id, ${GRUPO} as grupo, count(*)::int as n, count(*) filter (where e.discapacidad)::int as disc
    from (select p.vereda_id, ${EDAD} as edad, p.discapacidad from personas p
          join viviendas v on v.id = p.vivienda_id and v.deleted_at is null where p.deleted_at is null) e
    group by 1, 2`);
  return rows;
}

/** Tipos de discapacidad reportados (para focalizar programas), en cifras. */
export async function tiposDiscapacidad() {
  const { rows } = await db.execute<{ tipo: string; n: number }>(sql`
    select coalesce(nullif(initcap(trim(p.tipo_discapacidad)), ''), 'Sin especificar') as tipo, count(*)::int as n
    from personas p join viviendas v on v.id = p.vivienda_id and v.deleted_at is null
    where p.deleted_at is null and p.discapacidad group by 1 order by 2 desc limit 12`);
  return rows;
}

/** Puntos del mapa municipal. El nombre de la familia solo si autorizó compartir con la alcaldía. */
export async function puntosMunicipio() {
  const [{ rows: casas }, { rows: novedades }] = await Promise.all([
    db.execute<{ id: string; vereda_id: number; codigo: string | null; lat: number; lng: number; personas: number; jefe: string | null; pendiente: boolean }>(sql`
      select v.id, v.vereda_id, v.codigo, v.lat, v.lng, v.info_pendiente as pendiente,
        (select count(*) from personas p where p.vivienda_id = v.id and p.deleted_at is null)::int as personas,
        case when v.autoriza_alcaldia then (select trim(p.nombres || ' ' || coalesce(p.apellidos, '')) from personas p
          where p.vivienda_id = v.id and p.deleted_at is null order by p.es_jefe_hogar desc, p.created_at limit 1) end as jefe
      from viviendas v where v.deleted_at is null`),
    db.execute<{ id: string; vereda_id: number; titulo: string; categoria: string; estado: string; lat: number; lng: number }>(sql`
      select n.id, n.vereda_id, n.titulo, n.categoria, n.estado, n.lat, n.lng from novedades n
      where n.deleted_at is null and not n.archivado and n.lat is not null and n.lng is not null`),
  ]);
  return { casas, novedades };
}

export type FiltroPoblacion = { vereda?: number; grupo?: GrupoEdad; discapacidad?: boolean; q?: string };

/** Listado de personas para la alcaldía: solo familias que autorizaron compartir sus datos con ella. */
export async function personasMunicipio(f: FiltroPoblacion, limite = 500) {
  const conds = [sql`v.autoriza_alcaldia`];
  if (f.vereda) conds.push(sql`v.vereda_id = ${f.vereda}`);
  if (f.discapacidad) conds.push(sql`p.discapacidad`);
  if (f.q) {
    const like = `%${f.q}%`;
    conds.push(sql`((p.nombres || ' ' || coalesce(p.apellidos, '')) ilike ${like} or p.numero_documento ilike ${like} or v.codigo ilike ${like})`);
  }
  const grupo = f.grupo ? GRUPOS_EDAD.find((g) => g.id === f.grupo) : undefined;
  const { rows } = await db.execute<{
    id: string;
    vivienda_id: string;
    vereda: string;
    codigo: string | null;
    nombre: string;
    documento: string | null;
    telefono: string | null;
    edad: number | null;
    es_jefe: boolean;
    discapacidad: boolean;
    tipo_discapacidad: string | null;
  }>(sql`
    select * from (
      select p.id, v.id as vivienda_id, ve.nombre as vereda, v.codigo, trim(p.nombres || ' ' || coalesce(p.apellidos, '')) as nombre,
        p.numero_documento as documento, p.telefono, ${EDAD} as edad, p.es_jefe_hogar as es_jefe, p.discapacidad, p.tipo_discapacidad
      from personas p join viviendas v on v.id = p.vivienda_id and v.deleted_at is null join veredas ve on ve.id = v.vereda_id
      where p.deleted_at is null and ${sql.join(conds, sql` and `)}
    ) x
    ${grupo ? sql`where x.edad between ${grupo.min} and ${grupo.max}` : sql``}
    order by x.vereda, x.nombre
    limit ${limite}`);
  return rows;
}

/** Cuántas personas cumplen el filtro pero no se pueden listar (su familia no autorizó a la alcaldía). */
export async function personasSinAutorizacion(f: Omit<FiltroPoblacion, "q">) {
  const conds = [sql`not v.autoriza_alcaldia`];
  if (f.vereda) conds.push(sql`v.vereda_id = ${f.vereda}`);
  if (f.discapacidad) conds.push(sql`p.discapacidad`);
  const grupo = f.grupo ? GRUPOS_EDAD.find((g) => g.id === f.grupo) : undefined;
  const { rows } = await db.execute<{ n: number }>(sql`
    select count(*)::int as n from (
      select ${EDAD} as edad from personas p join viviendas v on v.id = p.vivienda_id and v.deleted_at is null
      where p.deleted_at is null and ${sql.join(conds, sql` and `)}
    ) x ${grupo ? sql`where x.edad between ${grupo.min} and ${grupo.max}` : sql``}`);
  return rows[0]?.n ?? 0;
}

/** Familias que la alcaldía puede elegir como beneficiarias (autorizaron compartir sus datos). */
export async function familiasElegibles(q: string, vereda?: number) {
  const like = `%${q}%`;
  const { rows } = await db.execute<{ id: string; codigo: string | null; vereda: string; jefe: string | null; documento: string | null; personas: number }>(sql`
    select v.id, v.codigo, ve.nombre as vereda, j.nombre as jefe, j.numero_documento as documento,
      (select count(*) from personas p where p.vivienda_id = v.id and p.deleted_at is null)::int as personas
    from viviendas v join veredas ve on ve.id = v.vereda_id
    left join lateral (select trim(p.nombres || ' ' || coalesce(p.apellidos, '')) as nombre, p.numero_documento from personas p
      where p.vivienda_id = v.id and p.deleted_at is null order by p.es_jefe_hogar desc, p.created_at limit 1) j on true
    where v.deleted_at is null and v.autoriza_alcaldia
      ${vereda ? sql`and v.vereda_id = ${vereda}` : sql``}
      ${q ? sql`and (j.nombre ilike ${like} or j.numero_documento ilike ${like} or v.codigo ilike ${like}
        or exists (select 1 from personas p where p.vivienda_id = v.id and p.deleted_at is null and
          ((p.nombres || ' ' || coalesce(p.apellidos, '')) ilike ${like} or p.numero_documento ilike ${like})))` : sql``}
    order by ve.nombre, j.nombre nulls last limit 40`);
  return rows;
}

/** Historial de ayudas de una familia (de la alcaldía y de su Junta). */
export async function historialAyudas(viviendaId: string) {
  const { rows } = await db.execute<{
    id: string;
    fecha: string | null;
    proyecto_id: string;
    proyecto: string;
    tipo: string;
    entidad: string | null;
    municipal: boolean;
    detalle: string | null;
    cantidad: string | null;
    valor: string | null;
    persona: string | null;
    registrado_por: string | null;
  }>(sql`
    select pa.id, coalesce(pa.fecha, pa.created_at::date)::text as fecha, pr.id as proyecto_id, pr.nombre as proyecto, pr.tipo, pr.entidad,
      (pr.vereda_id is null) as municipal, pa.detalle, pa.cantidad, pa.valor_estimado as valor,
      trim(pe.nombres || ' ' || coalesce(pe.apellidos, '')) as persona, u.nombre as registrado_por
    from participaciones pa join proyectos pr on pr.id = pa.proyecto_id
    left join personas pe on pe.id = pa.persona_id
    left join usuarios u on u.id = pa.created_by
    where pa.vivienda_id = ${viviendaId} and pa.deleted_at is null and pr.deleted_at is null
    order by 2 desc`);
  return rows;
}
