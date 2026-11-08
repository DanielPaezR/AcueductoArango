import { and, eq, isNull } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eliminarTramo } from "@/actions/red";
import { BotonEliminar } from "@/components/boton-eliminar";
import { Galeria, HistorialArreglos } from "@/components/historial-arreglos";
import { db, schema } from "@/db";
import { adjuntosDe, mantenimientosDe } from "@/lib/consultas-red";
import { puede } from "@/lib/permisos";
import { ESTADOS_RED, TIPOS_TRAMO, type EstadoRed, type TipoTramo } from "@/lib/red";
import { requerirPermiso } from "@/lib/session";
import { TramoForm } from "./tramo-form";

export const metadata = { title: "Tubería" };

export default async function Tramo({ params }: PageProps<"/acueducto/tramo/[id]">) {
  const u = await requerirPermiso("acueducto_red", "ver");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const t = await db.query.tramosAcueducto.findFirst({
    where: and(eq(schema.tramosAcueducto.id, id), isNull(schema.tramosAcueducto.deletedAt)),
  });
  if (!t) notFound();
  const [arreglos, fotos] = await Promise.all([mantenimientosDe({ tramoId: id }), adjuntosDe("tramo", id)]);
  const tipo = TIPOS_TRAMO[t.tipo as TipoTramo];
  const estado = ESTADOS_RED[t.estado as EstadoRed];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/acueducto" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Red del acueducto
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-stone-600">Tubería · {tipo?.corto}</p>
          <h1 className="text-[1.75rem] leading-tight font-bold">{t.nombre ?? tipo?.label}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="chip text-white" style={{ background: estado?.color }}>{estado?.label}</span>
            <span className="chip num bg-stone-200 text-stone-800">{t.longitudM ?? 0} m</span>
            {t.diametroPulg && <span className="chip num bg-stone-200 text-stone-800">{Number(t.diametroPulg)} pulgadas</span>}
            {t.material && <span className="chip bg-stone-200 text-stone-800">{t.material}</span>}
          </div>
        </div>
        {puede(u, "acueducto_red", "eliminar") && <BotonEliminar accion={eliminarTramo.bind(null, id)} pregunta="¿Eliminar esta tubería?" />}
      </header>

      {puede(u, "acueducto_red", "editar") && (
        <section className="tarjeta" aria-labelledby="datos">
          <h2 id="datos" className="mb-3 text-lg font-bold">Datos de la tubería</h2>
          <TramoForm
            t={{
              id: t.id,
              tipo: t.tipo as TipoTramo,
              nombre: t.nombre,
              coordenadas: t.coordenadas,
              diametroPulg: t.diametroPulg ? Number(t.diametroPulg) : null,
              material: t.material,
              anioInstalacion: t.anioInstalacion,
              estado: t.estado as EstadoRed,
              observaciones: t.observaciones,
            }}
          />
        </section>
      )}

      <Galeria fotos={fotos} />
      <HistorialArreglos items={arreglos} nuevoHref={puede(u, "mantenimientos", "crear") ? `/mantenimientos/nuevo?tramo=${id}` : undefined} />
    </div>
  );
}
