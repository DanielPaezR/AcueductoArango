import { sql } from "drizzle-orm";
import { ChartPie, ChevronRight, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { modulos } from "@/lib/config";
import { SECCIONES_ACUEDUCTO } from "@/lib/permisos";
import { fondosPermitidos, puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Reportes" };

const DESCARGAS = [
  { tipo: "viviendas", titulo: "Censo de viviendas", detalle: "Una fila por casa con las 12 preguntas, ubicación y acueducto", seccion: "censo" },
  { tipo: "personas", titulo: "Personas censadas", detalle: "Nombre, documento, edad y vivienda", seccion: "censo" },
  { tipo: "poblacion?vista=nucleos", titulo: "Habitantes por núcleo familiar", detalle: "Familias en orden alfabético de la cabeza de familia, con edades y discapacidad", seccion: "poblacion" },
  { tipo: "suscriptores", titulo: "Suscriptores y cartera", detalle: "Estado de pago, meses de atraso y deuda", seccion: "suscriptores" },
  { tipo: "movimientos", titulo: "Movimientos de dinero", detalle: "Ingresos y gastos con su estado y cargos (del acueducto y/o de la Junta, según su acceso)", seccion: "tesoreria" },
  { tipo: "mantenimientos", titulo: "Mantenimientos y arreglos", detalle: "Arreglos con costos de materiales y mano de obra", seccion: "mantenimientos" },
  { tipo: "ayudas", titulo: "Ayudas y proyectos", detalle: "Beneficiarios y participantes por proyecto", seccion: "ayudas" },
] as const;

export default async function Reportes() {
  const u = await requerirPermiso("reportes", "ver");
  const [m, sectores] = await Promise.all([
    modulos(),
    db.execute<{ sector: string; casas: number; con_agua: number; personas: number }>(sql`
      select coalesce(s.nombre, 'Sin sector') as sector, count(*)::int as casas,
        count(*) filter (where v.usa_acueducto)::int as con_agua,
        coalesce(sum((select count(*) from personas p where p.vivienda_id = v.id and p.deleted_at is null)), 0)::int as personas
      from viviendas v left join sectores s on s.id = v.sector_id where v.deleted_at is null
      group by 1 order by 1`),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-[1.75rem] leading-tight font-bold">Reportes</h1>

      {puede(u, "poblacion", "ver") && (
        <Link href="/poblacion" className="tarjeta flex items-center gap-4 hover:bg-stone-50">
          <ChartPie className="size-7 shrink-0 text-marca-700" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold">Caracterización de la población</span>
            <span className="text-stone-600">Grupos de edad, discapacidad, cabezas de familia y núcleos familiares</span>
          </span>
          <ChevronRight className="size-5 text-stone-400" aria-hidden />
        </Link>
      )}

      <section className="tarjeta overflow-x-auto" aria-labelledby="sectores">
        <h2 id="sectores" className="mb-3 text-lg font-bold">Por sector</h2>
        <table className="w-full">
          <thead className="text-left text-sm text-stone-600">
            <tr>
              <th className="py-2 pr-3 font-semibold">Sector</th>
              <th className="py-2 pr-3 text-right font-semibold">Casas</th>
              {m.acueducto && <th className="py-2 pr-3 text-right font-semibold">Con acueducto</th>}
              <th className="py-2 text-right font-semibold">Personas</th>
            </tr>
          </thead>
          <tbody>
            {sectores.rows.map((s) => (
              <tr key={s.sector} className="border-t border-stone-200">
                <td className="py-2 pr-3">{s.sector}</td>
                <td className="num py-2 pr-3 text-right font-semibold">{s.casas}</td>
                {m.acueducto && <td className="num py-2 pr-3 text-right">{s.con_agua}</td>}
                <td className="num py-2 text-right">{s.personas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {u.rol === "superadmin" && (
        <section className="tarjeta zocalo zocalo-pendiente" aria-labelledby="respaldo">
          <h2 id="respaldo" className="text-lg font-bold">Respaldo completo</h2>
          <p className="mt-1 mb-3 pb-1 text-stone-700">
            Todas las tablas del sistema en un solo Excel. Descárguelo cada semana y guárdelo en un lugar seguro (no en grupos de WhatsApp):
            tiene datos personales.
          </p>
          <a href="/api/respaldo" className="btn-secundario mb-2" download>
            <FileSpreadsheet className="size-5" aria-hidden />
            Descargar respaldo
          </a>
        </section>
      )}

      <section aria-labelledby="descargas">
        <h2 id="descargas" className="mb-1 text-lg font-bold">Descargar en Excel</h2>
        <p className="mb-3 text-stone-700">Contienen datos personales: compártalos solo con la Junta.</p>
        <ul className="space-y-2.5">
          {DESCARGAS.filter(
            (d) =>
              (m.acueducto || d.tipo === "movimientos" || !(SECCIONES_ACUEDUCTO as readonly string[]).includes(d.seccion)) &&
              (d.tipo === "movimientos" ? fondosPermitidos(u, "ver").length > 0 : puede(u, d.seccion, "ver")),
          ).map((d) => (
            <li key={d.tipo}>
              <a href={`/api/reportes/${d.tipo}`} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 hover:border-marca-600" download>
                <FileSpreadsheet className="size-7 shrink-0 text-marca-700" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{d.titulo}</span>
                  <span className="text-sm text-stone-600">{d.detalle}</span>
                </span>
                <span className="font-semibold text-marca-700">Descargar</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
