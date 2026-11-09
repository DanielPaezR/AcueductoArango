import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { hoyBogota } from "@/lib/dinero";
import { datosLibro } from "@/lib/libro";
import { requerirPermiso } from "@/lib/session";
import { AsientoForm } from "../../asiento-form";

export const metadata = { title: "Corregir asiento" };

export default async function EditarAsiento({ params }: PageProps<"/libros/contabilidad/[id]/editar">) {
  await requerirPermiso("libro_contable", "editar");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const m = await db.query.movimientos.findFirst({ where: eq(schema.movimientos.id, id) });
  if (!m) notFound();
  const { cuentas } = await datosLibro(1);
  if (!cuentas.some((c) => c.id === m.cuentaId)) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/libros/contabilidad" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Libro de contabilidad
      </Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">Corregir asiento N.º {m.numero}</h1>
      <AsientoForm
        cuentas={cuentas.map((c) => ({ id: c.id, nombre: c.nombre }))}
        hoy={hoyBogota()}
        inicial={{
          id: m.id,
          cuentaId: m.cuentaId,
          tipo: m.tipo as "ingreso",
          categoria: m.categoria,
          concepto: m.concepto,
          fecha: m.fecha,
          valor: Number(m.valor),
          comprobante: m.comprobante,
        }}
      />
    </div>
  );
}
