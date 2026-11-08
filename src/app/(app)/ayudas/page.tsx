import { desc, isNull, sql } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { db, schema } from "@/db";
import { ESTADOS_PROYECTO, TIPOS_PROYECTO } from "@/lib/ayudas";
import { fechaCorta, hoyBogota } from "@/lib/dinero";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";
import { ProyectoForm } from "./proyecto-form";

export const metadata = { title: "Ayudas y proyectos" };
const PR = schema.proyectos;

export default async function Ayudas() {
  const u = await requerirPermiso("ayudas", "ver");
  const proyectos = await db
    .select({
      id: PR.id,
      nombre: PR.nombre,
      tipo: PR.tipo,
      entidad: PR.entidad,
      estado: PR.estado,
      fechaInicio: PR.fechaInicio,
      casas: sql<number>`(select count(distinct pa.vivienda_id)::int from participaciones pa where pa.proyecto_id = proyectos.id and pa.deleted_at is null)`,
    })
    .from(PR)
    .where(isNull(PR.deletedAt))
    .orderBy(sql`case ${PR.estado} when 'activo' then 0 else 1 end`, desc(PR.createdAt));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-[1.75rem] leading-tight font-bold">Ayudas y proyectos</h1>
      {proyectos.length ? (
        <ul className="space-y-2.5">
          {proyectos.map((p) => (
            <li key={p.id}>
              <Link
                href={`/ayudas/${p.id}`}
                className={`zocalo ${p.estado === "activo" ? "zocalo-agua" : "zocalo-muro"} flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 pb-5 hover:border-stone-300`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{p.nombre}</div>
                  <div className="text-sm text-stone-600">
                    {[TIPOS_PROYECTO[p.tipo as keyof typeof TIPOS_PROYECTO], p.entidad, ESTADOS_PROYECTO[p.estado as keyof typeof ESTADOS_PROYECTO], fechaCorta(p.fechaInicio)]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <span className="text-right">
                  <span className="num block text-lg font-bold">{p.casas}</span>
                  <span className="text-sm text-stone-600">casas</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-stone-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="tarjeta text-stone-600">Todavía no hay ayudas ni proyectos registrados.</div>
      )}
      {puede(u, "ayudas", "crear") && (
        <section className="tarjeta" aria-labelledby="nuevo">
          <h2 id="nuevo" className="mb-3 text-lg font-bold">Nueva ayuda o proyecto</h2>
          <ProyectoForm hoy={hoyBogota()} />
        </section>
      )}
    </div>
  );
}
