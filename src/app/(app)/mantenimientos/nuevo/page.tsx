import { and, eq, isNull } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { MantenimientoForm } from "@/components/mantenimiento-form";
import { db, schema } from "@/db";
import { opcionesRed } from "@/lib/consultas-red";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Registrar arreglo" };
const UUID = /^[0-9a-f-]{36}$/i;

export default async function NuevoMantenimiento({ searchParams }: PageProps<"/mantenimientos/nuevo">) {
  await requerirPermiso("mantenimientos", "crear");
  const sp = await searchParams;
  const elemento = typeof sp.elemento === "string" && UUID.test(sp.elemento) ? sp.elemento : null;
  const tramo = typeof sp.tramo === "string" && UUID.test(sp.tramo) ? sp.tramo : null;
  const viviendaId = typeof sp.vivienda === "string" && UUID.test(sp.vivienda) ? sp.vivienda : null;
  const [opciones, vivienda] = await Promise.all([
    opcionesRed(),
    viviendaId
      ? db.query.viviendas.findFirst({ where: and(eq(schema.viviendas.id, viviendaId), isNull(schema.viviendas.deletedAt)), columns: { id: true, codigo: true } })
      : null,
  ]);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/mantenimientos" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Mantenimientos
      </Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">Registrar arreglo</h1>
      <MantenimientoForm
        key={`${elemento}-${tramo}-${viviendaId}`}
        {...opciones}
        vivienda={vivienda ? { id: vivienda.id, label: vivienda.codigo ?? "" } : null}
        predeterminado={{ elementoId: elemento, tramoId: tramo }}
      />
    </div>
  );
}
