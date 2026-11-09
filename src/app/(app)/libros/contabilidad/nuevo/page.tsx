import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hoyBogota } from "@/lib/dinero";
import { datosLibro } from "@/lib/libro";
import { requerirPermiso } from "@/lib/session";
import { AsientoForm } from "../asiento-form";

export const metadata = { title: "Nuevo asiento" };

export default async function NuevoAsiento() {
  await requerirPermiso("libro_contable", "crear");
  const { cuentas } = await datosLibro(1);
  const activas = cuentas.filter((c) => c.activa).map((c) => ({ id: c.id, nombre: c.nombre }));
  if (!activas.length) redirect("/libros/contabilidad");
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/libros/contabilidad" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Libro de contabilidad
      </Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">Nuevo asiento</h1>
      <AsientoForm cuentas={activas} hoy={hoyBogota()} />
    </div>
  );
}
