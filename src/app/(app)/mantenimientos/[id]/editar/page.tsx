import { and, eq, isNull } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MantenimientoForm } from "@/components/mantenimiento-form";
import { db, schema } from "@/db";
import { opcionesRed } from "@/lib/consultas-red";
import { requerirPermiso } from "@/lib/session";
import type { MantenimientoInput } from "@/lib/validacion";

export const metadata = { title: "Editar arreglo" };

export default async function EditarMantenimiento({ params }: PageProps<"/mantenimientos/[id]/editar">) {
  await requerirPermiso("mantenimientos", "editar");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const m = await db.query.mantenimientos.findFirst({ where: and(eq(schema.mantenimientos.id, id), isNull(schema.mantenimientos.deletedAt)) });
  if (!m) notFound();
  const [opciones, materiales, compra, vivienda] = await Promise.all([
    opcionesRed(),
    db.select().from(schema.materialesUsados).where(eq(schema.materialesUsados.mantenimientoId, id)),
    db.query.compras.findFirst({ where: eq(schema.compras.mantenimientoId, id) }),
    m.viviendaId ? db.query.viviendas.findFirst({ where: eq(schema.viviendas.id, m.viviendaId), columns: { id: true, codigo: true } }) : null,
  ]);
  const inicial: MantenimientoInput = {
    id: m.id,
    tipo: m.tipo as MantenimientoInput["tipo"],
    titulo: m.titulo,
    descripcion: m.descripcion,
    elementoId: m.elementoId,
    tramoId: m.tramoId,
    viviendaId: m.viviendaId,
    lat: m.lat,
    lng: m.lng,
    fechaReporte: m.fechaReporte,
    fechaEjecucion: m.fechaEjecucion,
    estado: m.estado as MantenimientoInput["estado"],
    prioridad: m.prioridad as MantenimientoInput["prioridad"],
    costoManoObra: Number(m.costoManoObra),
    materiales: materiales.map((x) => ({
      id: x.id,
      descripcion: x.descripcion,
      cantidad: Number(x.cantidad),
      unidad: x.unidad,
      valorUnitario: x.valorUnitario === null ? null : Number(x.valorUnitario),
    })),
    compra: compra
      ? { id: compra.id, proveedor: compra.proveedor, numeroFactura: compra.numeroFactura, fecha: compra.fecha, total: Number(compra.total) }
      : null,
  };
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/mantenimientos/${id}`} className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Volver
      </Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">Editar arreglo</h1>
      <MantenimientoForm {...opciones} inicial={inicial} vivienda={vivienda ? { id: vivienda.id, label: vivienda.codigo ?? "" } : null} />
    </div>
  );
}
