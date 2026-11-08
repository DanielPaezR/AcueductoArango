import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { db, schema } from "@/db";
import { fechaCorta, pesos } from "@/lib/dinero";
import { puede } from "@/lib/permisos";
import { ESTADOS_MANTENIMIENTO, PRIORIDADES, TIPOS_MANTENIMIENTO } from "@/lib/red";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Mantenimientos" };

const FILTROS = { abiertos: "Pendientes", terminado: "Terminados", todos: "Todos" } as const;
const ZOCALO: Record<string, string> = { reportado: "zocalo-alerta", en_proceso: "zocalo-pendiente", terminado: "zocalo-agua", cancelado: "zocalo-muro" };
const { mantenimientos: MT } = schema;

export default async function Mantenimientos({ searchParams }: PageProps<"/mantenimientos">) {
  const u = await requerirPermiso("mantenimientos", "ver");
  const sp = await searchParams;
  const f = (typeof sp.f === "string" && sp.f in FILTROS ? sp.f : "abiertos") as keyof typeof FILTROS;
  const filas = await db
    .select({
      id: MT.id,
      titulo: MT.titulo,
      tipo: MT.tipo,
      estado: MT.estado,
      prioridad: MT.prioridad,
      fechaReporte: MT.fechaReporte,
      fechaEjecucion: MT.fechaEjecucion,
      costo: sql<string>`${MT.costoManoObra} + coalesce((select sum(mu.cantidad * coalesce(mu.valor_unitario, 0)) from materiales_usados mu where mu.mantenimiento_id = mantenimientos.id), 0)`,
    })
    .from(MT)
    .where(
      and(
        isNull(MT.deletedAt),
        f === "abiertos" ? sql`${MT.estado} in ('reportado','en_proceso')` : f === "terminado" ? eq(MT.estado, "terminado") : undefined,
      ),
    )
    .orderBy(sql`case ${MT.prioridad} when 'alta' then 0 when 'media' then 1 else 2 end`, desc(MT.createdAt))
    .limit(200);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.75rem] leading-tight font-bold">Mantenimientos y arreglos</h1>
        {puede(u, "mantenimientos", "crear") && (
          <Link href="/mantenimientos/nuevo" className="btn-primario">
            <Plus className="size-5" aria-hidden />
            Registrar arreglo
          </Link>
        )}
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Filtrar">
        {Object.entries(FILTROS).map(([k, l]) => (
          <Link
            key={k}
            href={`/mantenimientos?f=${k}`}
            aria-current={f === k ? "page" : undefined}
            className={`chip min-h-10 px-4 ${f === k ? "bg-marca-700 text-white" : "bg-white text-stone-700 ring-1 ring-stone-300"}`}
          >
            {l}
          </Link>
        ))}
      </nav>
      <ul className="space-y-2.5">
        {filas.map((m) => (
          <li key={m.id}>
            <Link href={`/mantenimientos/${m.id}`} className={`zocalo ${ZOCALO[m.estado]} flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 pb-5 hover:border-stone-300`}>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{m.titulo}</div>
                <div className="text-sm text-stone-600">
                  {TIPOS_MANTENIMIENTO[m.tipo as keyof typeof TIPOS_MANTENIMIENTO]} · {ESTADOS_MANTENIMIENTO[m.estado as keyof typeof ESTADOS_MANTENIMIENTO]}
                  {m.estado !== "terminado" && m.prioridad === "alta" && <span className="font-semibold text-teja-700"> · Prioridad {PRIORIDADES.alta.toLowerCase()}</span>} ·{" "}
                  <span className="num">{fechaCorta(m.fechaEjecucion ?? m.fechaReporte)}</span>
                </div>
              </div>
              {Number(m.costo) > 0 && <span className="num font-semibold">{pesos(m.costo)}</span>}
              <ChevronRight className="size-5 shrink-0 text-stone-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      {!filas.length && <div className="tarjeta text-stone-600">{f === "abiertos" ? "No hay arreglos pendientes." : "No hay registros."}</div>}
    </div>
  );
}
