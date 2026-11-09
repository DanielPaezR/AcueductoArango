import { and, eq, isNull } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eliminarItem } from "@/actions/libros";
import { BotonEliminar } from "@/components/boton-eliminar";
import { Galeria } from "@/components/fotos-picker";
import { db, schema } from "@/db";
import { fechaCorta, hoyBogota, pesos } from "@/lib/dinero";
import { adjuntosDe } from "@/lib/libro";
import { ESTADOS_BIEN } from "@/lib/opciones";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";
import { ItemForm } from "../item-form";

export const metadata = { title: "Bien del inventario" };

/** Ficha de un bien: quien puede editar ve el formulario; los demás, solo la ficha. */
export default async function VerItem({ params }: PageProps<"/libros/inventario/[id]">) {
  const u = await requerirPermiso("libro_inventario", "ver");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const i = await db.query.inventario.findFirst({ where: and(eq(schema.inventario.id, id), isNull(schema.inventario.deletedAt)) });
  if (!i) notFound();
  const fotos = await adjuntosDe("inventario", id);
  const editar = puede(u, "libro_inventario", "editar");
  const e = ESTADOS_BIEN[i.estado as keyof typeof ESTADOS_BIEN];
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/libros/inventario" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Libro de inventario
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[1.75rem] leading-tight font-bold">{i.nombre}</h1>
        {e && <span className={`chip ${e.clase}`}>{e.label}</span>}
      </div>
      {fotos.length > 0 && <Galeria adjuntos={fotos} />}
      {editar ? (
        <ItemForm hoy={hoyBogota()} inicial={i} />
      ) : (
        <dl className="tarjeta grid gap-3 sm:grid-cols-2">
          {[
            ["Cantidad", i.cantidad],
            ["Código", i.codigo],
            ["Dónde está", i.ubicacion],
            ["Procedencia", i.procedencia],
            ["Adquirido", fechaCorta(i.fechaAdquisicion)],
            ["Valor aproximado", i.valor && pesos(Number(i.valor))],
            ["Descripción", i.descripcion],
            ["Observaciones", i.observaciones],
          ]
            .filter(([, v]) => v)
            .map(([t, v]) => (
              <div key={t as string}>
                <dt className="text-sm text-stone-600">{t}</dt>
                <dd className="font-semibold whitespace-pre-line">{v}</dd>
              </div>
            ))}
        </dl>
      )}
      {puede(u, "libro_inventario", "eliminar") && (
        <div className="flex justify-end">
          <BotonEliminar accion={eliminarItem.bind(null, i.id)} pregunta={`¿Eliminar "${i.nombre}" del inventario? Si solo se dañó o se perdió, mejor márquelo como "Dado de baja".`} />
        </div>
      )}
    </div>
  );
}
