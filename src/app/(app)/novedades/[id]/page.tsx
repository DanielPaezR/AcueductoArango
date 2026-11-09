import { and, asc, eq, isNull } from "drizzle-orm";
import { Archive, ArchiveRestore, Check, ChevronLeft, Hammer, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { archivarNovedad, cambiarEstadoNovedad, eliminarNovedad } from "@/actions/novedades";
import { BotonEliminar } from "@/components/boton-eliminar";
import { Galeria } from "@/components/fotos-picker";
import { MapaPunto } from "@/components/mapa/dinamicos";
import { db, schema } from "@/db";
import { fechaCorta } from "@/lib/dinero";
import { adjuntosDe } from "@/lib/libro";
import { svgNovedad } from "@/lib/novedades";
import { CATEGORIAS_NOVEDAD, ESTADOS_NOVEDAD, type CategoriaNovedad, type EstadoNovedad } from "@/lib/opciones";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Novedad" };

const ACCIONES: Record<string, string> = { crear: "Registró", editar: "Actualizó", archivar: "Archivó", reactivar: "Reactivó", adjuntar: "Agregó fotos" };
const ESTADO_TXT: Record<string, string> = { pendiente: "pendiente", en_ejecucion: "en ejecución", realizado: "realizado" };

export default async function VerNovedad({ params }: PageProps<"/novedades/[id]">) {
  const u = await requerirPermiso("novedades", "ver");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const n = await db.query.novedades.findFirst({ where: and(eq(schema.novedades.id, id), isNull(schema.novedades.deletedAt)) });
  if (!n) notFound();
  const B = schema.auditoria;
  const [fotos, eventos] = await Promise.all([
    adjuntosDe("novedad", id),
    db
      .select({ accion: B.accion, detalle: B.datos, fecha: B.fecha, usuario: schema.usuarios.nombre })
      .from(B)
      .leftJoin(schema.usuarios, eq(schema.usuarios.id, B.usuarioId))
      .where(and(eq(B.entidad, "novedad"), eq(B.entidadId, id)))
      .orderBy(asc(B.fecha)),
  ]);
  const editar = puede(u, "novedades", "editar");
  const c = CATEGORIAS_NOVEDAD[n.categoria as CategoriaNovedad];
  const e = ESTADOS_NOVEDAD[n.estado as EstadoNovedad];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={n.archivado ? "/novedades?ver=historial" : "/novedades"} className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Novedades y obras
      </Link>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {e && <span className={`chip ${e.clase}`}>{e.label}</span>}
          {n.archivado && <span className="chip bg-stone-200 text-stone-700">Archivada</span>}
          <span className="text-stone-600">{c?.label}</span>
        </div>
        <h1 className="text-[1.75rem] leading-tight font-bold">{n.titulo}</h1>
        {n.fechaRealizado && <p className="font-semibold text-marca-800">Realizada el {fechaCorta(n.fechaRealizado)}</p>}
      </div>

      {n.descripcion && <p className="tarjeta whitespace-pre-line">{n.descripcion}</p>}

      {editar && (
        <div className="flex flex-wrap gap-2">
          {n.estado === "pendiente" && (
            <form action={cambiarEstadoNovedad.bind(null, n.id, "en_ejecucion")}>
              <button className="btn-secundario"><Hammer className="size-5" aria-hidden />Empezó el trabajo</button>
            </form>
          )}
          {n.estado !== "realizado" && (
            <form action={cambiarEstadoNovedad.bind(null, n.id, "realizado")}>
              <button className="btn-primario"><Check className="size-5" aria-hidden />Marcar como realizado</button>
            </form>
          )}
          {n.estado === "realizado" && !n.archivado && (
            <form action={archivarNovedad.bind(null, n.id, true)}>
              <button className="btn-primario"><Archive className="size-5" aria-hidden />Archivar (pasa al historial)</button>
            </form>
          )}
          {n.archivado && (
            <form action={archivarNovedad.bind(null, n.id, false)}>
              <button className="btn-secundario"><ArchiveRestore className="size-5" aria-hidden />Volver a activar</button>
            </form>
          )}
          <Link href={`/novedades/${n.id}/editar`} className="btn-secundario"><Pencil className="size-5" aria-hidden />Corregir o agregar fotos</Link>
        </div>
      )}

      {n.lat !== null && n.lng !== null && (
        <div className="overflow-hidden rounded-xl ring-1 ring-stone-200">
          <MapaPunto lat={n.lat} lng={n.lng} iconoHtml={svgNovedad(n.categoria, n.estado, 30)} alfiler />
        </div>
      )}

      {fotos.length > 0 && (
        <section className="tarjeta space-y-3">
          <h2 className="text-lg font-bold">Fotos</h2>
          <Galeria adjuntos={fotos} />
        </section>
      )}

      <section className="tarjeta space-y-2">
        <h2 className="text-lg font-bold">Historial</h2>
        <ol className="space-y-1.5">
          {eventos.map((ev, i) => {
            const estado = (ev.detalle as { estado?: string } | null)?.estado;
            return (
              <li key={i} className="text-[0.95rem]">
                <span className="num text-stone-600">{ev.fecha.toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" })}</span> ·{" "}
                <strong>{ev.usuario ?? "—"}</strong> {(ACCIONES[ev.accion] ?? ev.accion).toLowerCase()}
                {estado && ev.accion === "editar" && <> (estado: {ESTADO_TXT[estado] ?? estado})</>}
              </li>
            );
          })}
        </ol>
      </section>

      {puede(u, "novedades", "eliminar") && (
        <div className="flex justify-end">
          <BotonEliminar accion={eliminarNovedad.bind(null, n.id)} pregunta="¿Eliminar esta novedad? Si ya se hizo, mejor archívela para que quede en el historial." />
        </div>
      )}
    </div>
  );
}
