import { sql } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { ESTADOS_PROYECTO, TIPOS_PROYECTO } from "@/lib/ayudas";
import { fechaCorta, pesos } from "@/lib/dinero";
import { puede } from "@/lib/permisos";
import { requerirMunicipio } from "@/lib/session";
import { listarVeredas } from "@/lib/veredas";
import { NuevoProyectoForm } from "./forms";

export const metadata = { title: "Proyectos y ayudas" };

export default async function ProyectosMunicipales() {
  const u = await requerirMunicipio("municipio_ayudas", "ver", "/municipio/proyectos");
  const { rows } = await db.execute<{
    id: string; nombre: string; tipo: string; entidad: string | null; estado: string; fecha_inicio: string | null;
    vereda: string | null; familias: number; veredas: number; valor: number; cupo: number | null;
  }>(sql`
    select pr.id, pr.nombre, pr.tipo, pr.entidad, pr.estado, pr.fecha_inicio::text, ve.nombre as vereda, pr.cupo_familias as cupo,
      (select count(distinct pa.vivienda_id) from participaciones pa where pa.proyecto_id = pr.id and pa.deleted_at is null)::int as familias,
      (select count(distinct pa.vereda_id) from participaciones pa where pa.proyecto_id = pr.id and pa.deleted_at is null)::int as veredas,
      coalesce((select sum(pa.valor_estimado) from participaciones pa where pa.proyecto_id = pr.id and pa.deleted_at is null), 0)::float as valor
    from proyectos pr left join veredas ve on ve.id = pr.vereda_id
    where pr.deleted_at is null
    order by (pr.vereda_id is not null), pr.estado <> 'activo', pr.created_at desc`);
  const municipales = rows.filter((r) => !r.vereda);
  const deVeredas = rows.filter((r) => r.vereda);
  const fila = (r: (typeof rows)[number]) => (
    <li key={r.id}>
      <Link href={`/municipio/proyectos/${r.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50 sm:px-5">
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{r.nombre}</span>
          <span className="text-sm text-stone-600">
            {[r.vereda ? `Vereda ${r.vereda}` : r.entidad, TIPOS_PROYECTO[r.tipo as keyof typeof TIPOS_PROYECTO], ESTADOS_PROYECTO[r.estado as keyof typeof ESTADOS_PROYECTO], r.fecha_inicio && fechaCorta(r.fecha_inicio)]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <span className="num shrink-0 text-right text-sm text-stone-700">
          <strong className="block text-base">{r.cupo ? `${r.familias} de ${r.cupo} familias` : `${r.familias} familia(s)`}</strong>
          {r.veredas > 0 && `${r.veredas} vereda(s)`}
          {r.valor > 0 && <span className="block">{pesos(r.valor)}</span>}
        </span>
        <ChevronRight className="size-5 text-stone-400" aria-hidden />
      </Link>
    </li>
  );
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-[1.75rem] leading-tight font-bold">Proyectos y ayudas</h1>
      <section className="space-y-2">
        <h2 className="text-lg font-bold">De la alcaldía</h2>
        <p className="text-stone-600">Las ven todas las Juntas, que también pueden anotar a sus familias.</p>
        <ul className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">
          {municipales.map(fila)}
          {!municipales.length && <li className="px-4 py-3.5 text-stone-600 sm:px-5">Todavía no hay proyectos de la alcaldía.</li>}
        </ul>
      </section>
      {puede(u, "municipio_ayudas", "crear") && (
        <details className="tarjeta">
          <summary className="cursor-pointer text-lg font-bold">Crear proyecto o ayuda de la alcaldía</summary>
          <div className="mt-4">
            <NuevoProyectoForm veredas={(await listarVeredas()).map((v) => ({ id: v.id, nombre: v.nombre }))} />
          </div>
        </details>
      )}
      {deVeredas.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold">De las Juntas</h2>
          <ul className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">{deVeredas.map(fila)}</ul>
        </section>
      )}
    </div>
  );
}
