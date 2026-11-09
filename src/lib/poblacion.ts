import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { edadPersona, grupoDeEdad, type GrupoEdad } from "./opciones";

export type Habitante = {
  id: string;
  nombre: string;
  documento: string | null;
  edad: number | null;
  grupo: GrupoEdad | null;
  discapacidad: boolean;
  tipoDiscapacidad: string | null;
  esJefe: boolean;
  telefono: string | null;
  viviendaId: string;
  codigo: string | null;
  sector: string | null;
  sectorId: number | null;
  referencia: string | null;
};

const ordenar = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base" });

/** Todas las personas censadas con su hogar (sin datos suprimidos). */
export async function habitantes(): Promise<Habitante[]> {
  const { rows } = await db.execute<{
    id: string;
    nombre: string;
    numero_documento: string | null;
    fecha_nacimiento: string | null;
    edad_reportada: number | null;
    edad_reportada_en: string | null;
    discapacidad: boolean;
    tipo_discapacidad: string | null;
    es_jefe_hogar: boolean;
    telefono: string | null;
    vivienda_id: string;
    codigo: string | null;
    sector: string | null;
    sector_id: number | null;
    referencia: string | null;
  }>(sql`
    select p.id, trim(p.nombres || ' ' || coalesce(p.apellidos, '')) as nombre, p.numero_documento,
      p.fecha_nacimiento::text, p.edad_reportada, p.edad_reportada_en::text, p.discapacidad, p.tipo_discapacidad,
      p.es_jefe_hogar, p.telefono, v.id as vivienda_id, v.codigo, s.nombre as sector, v.sector_id,
      coalesce(v.nombre_predio, v.referencia) as referencia
    from personas p
    join viviendas v on v.id = p.vivienda_id and v.deleted_at is null
    left join sectores s on s.id = v.sector_id
    where p.deleted_at is null`);
  return rows.map((r) => {
    const e = edadPersona({ fechaNacimiento: r.fecha_nacimiento, edadReportada: r.edad_reportada, edadReportadaEn: r.edad_reportada_en });
    return {
      id: r.id,
      nombre: r.nombre,
      documento: r.numero_documento,
      edad: e,
      grupo: grupoDeEdad(e),
      discapacidad: r.discapacidad,
      tipoDiscapacidad: r.tipo_discapacidad,
      esJefe: r.es_jefe_hogar,
      telefono: r.telefono,
      viviendaId: r.vivienda_id,
      codigo: r.codigo,
      sector: r.sector,
      sectorId: r.sector_id,
      referencia: r.referencia,
    };
  });
}

export type Nucleo = { viviendaId: string; codigo: string | null; sector: string | null; referencia: string | null; jefe: Habitante | null; miembros: Habitante[] };

/** Núcleos familiares en orden alfabético de la cabeza de familia; dentro de cada uno, el jefe primero y luego por edad. */
export function nucleos(lista: Habitante[]): Nucleo[] {
  const porCasa = new Map<string, Habitante[]>();
  for (const h of lista) porCasa.set(h.viviendaId, [...(porCasa.get(h.viviendaId) ?? []), h]);
  const res: Nucleo[] = [...porCasa.values()].map((ms) => {
    const jefe = ms.find((m) => m.esJefe) ?? null;
    const resto = ms.filter((m) => m !== jefe).sort((a, b) => (b.edad ?? -1) - (a.edad ?? -1) || ordenar(a.nombre, b.nombre));
    const x = ms[0];
    return { viviendaId: x.viviendaId, codigo: x.codigo, sector: x.sector, referencia: x.referencia, jefe, miembros: jefe ? [jefe, ...resto] : resto };
  });
  return res.sort((a, b) => ordenar(a.jefe?.nombre ?? a.miembros[0]?.nombre ?? "", b.jefe?.nombre ?? b.miembros[0]?.nombre ?? ""));
}

export function jefesAlfabetico(lista: Habitante[]) {
  return lista.filter((h) => h.esJefe).sort((a, b) => ordenar(a.nombre, b.nombre));
}

export type FiltroPoblacion = { sector?: number; grupo?: GrupoEdad; discapacidad?: boolean };

export function filtrar(lista: Habitante[], f: FiltroPoblacion) {
  return lista
    .filter((h) => (!f.sector || h.sectorId === f.sector) && (!f.grupo || h.grupo === f.grupo) && (f.discapacidad === undefined || h.discapacidad === f.discapacidad))
    .sort((a, b) => ordenar(a.nombre, b.nombre));
}

/** Total de hogares: viviendas habitadas con al menos una persona registrada. */
export async function totalHogares() {
  const { rows } = await db.execute<{ hogares: number; viviendas: number }>(sql`
    select count(*) filter (where exists (select 1 from personas p where p.vivienda_id = v.id and p.deleted_at is null))::int as hogares,
      count(*)::int as viviendas
    from viviendas v where v.deleted_at is null`);
  return rows[0];
}
