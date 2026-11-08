import { and, eq, isNull } from "drizzle-orm";
import { ChevronLeft, Navigation, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonEliminar } from "@/components/boton-eliminar";
import { Galeria, HistorialArreglos } from "@/components/historial-arreglos";
import { MapaPunto } from "@/components/mapa/dinamicos";
import { db, schema } from "@/db";
import { eliminarElemento } from "@/actions/red";
import { adjuntosDe, mantenimientosDe } from "@/lib/consultas-red";
import { puede } from "@/lib/permisos";
import { CAMPOS_DATOS, ESTADOS_RED, TIPOS_ELEMENTO, type EstadoRed, type TipoElemento } from "@/lib/red";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Punto de la red" };

export default async function Punto({ params }: PageProps<"/acueducto/punto/[id]">) {
  const u = await requerirPermiso("acueducto_red", "ver");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const e = await db.query.elementosAcueducto.findFirst({
    where: and(eq(schema.elementosAcueducto.id, id), isNull(schema.elementosAcueducto.deletedAt)),
  });
  if (!e) notFound();
  const [arreglos, fotos] = await Promise.all([mantenimientosDe({ elementoId: id }), adjuntosDe("elemento", id)]);
  const tipo = TIPOS_ELEMENTO[e.tipo as TipoElemento] ?? TIPOS_ELEMENTO.otro;
  const estado = ESTADOS_RED[e.estado as EstadoRed];
  const datos = Object.entries((e.datos ?? {}) as Record<string, string | number>);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/acueducto" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Red del acueducto
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-stone-600">{tipo.label}</p>
          <h1 className="text-[1.75rem] leading-tight font-bold">{e.nombre ?? tipo.label}</h1>
          <span className="chip mt-2 text-white" style={{ background: estado?.color }}>{estado?.label}</span>
        </div>
        <div className="flex gap-2">
          {puede(u, "acueducto_red", "editar") && (
            <Link href={`/acueducto/punto/${id}/editar`} className="btn-primario">
              <Pencil className="size-5" aria-hidden />
              Editar
            </Link>
          )}
          {puede(u, "acueducto_red", "eliminar") && <BotonEliminar accion={eliminarElemento.bind(null, id)} pregunta="¿Eliminar este punto de la red?" />}
        </div>
      </header>

      <section className="tarjeta space-y-3">
        <MapaPunto lat={e.lat} lng={e.lng} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="num text-sm text-stone-600">
            {e.lat.toFixed(6)}, {e.lng.toFixed(6)}
            {e.altitudM != null && <> · {e.altitudM} m s.n.m.</>}
          </span>
          <a className="btn-secundario min-h-10 px-3.5 py-1.5 text-[0.95rem]" href={`https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}`} target="_blank" rel="noreferrer">
            <Navigation className="size-4" aria-hidden />
            Cómo llegar
          </a>
        </div>
        {(datos.length > 0 || e.observaciones) && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-stone-200 pt-3">
            {datos.map(([k, v]) => (
              <div key={k}>
                <dt className="text-sm text-stone-600">{CAMPOS_DATOS[k]?.label ?? k}</dt>
                <dd className="num font-semibold">{typeof v === "number" ? v.toLocaleString("es-CO") : v}</dd>
              </div>
            ))}
            {e.observaciones && (
              <div className="col-span-2">
                <dt className="text-sm text-stone-600">Observaciones</dt>
                <dd>{e.observaciones}</dd>
              </div>
            )}
          </dl>
        )}
      </section>

      <Galeria fotos={fotos} />
      <HistorialArreglos items={arreglos} nuevoHref={puede(u, "mantenimientos", "crear") ? `/mantenimientos/nuevo?elemento=${id}` : undefined} />
    </div>
  );
}
