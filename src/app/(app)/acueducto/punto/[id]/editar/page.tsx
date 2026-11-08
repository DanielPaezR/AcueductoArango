import { and, eq, isNull } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ElementoForm } from "@/components/elemento-form";
import { db, schema } from "@/db";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Editar punto" };

export default async function EditarPunto({ params }: PageProps<"/acueducto/punto/[id]/editar">) {
  await requerirPermiso("acueducto_red", "editar");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const e = await db.query.elementosAcueducto.findFirst({
    where: and(eq(schema.elementosAcueducto.id, id), isNull(schema.elementosAcueducto.deletedAt)),
  });
  if (!e) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/acueducto/punto/${id}`} className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Volver
      </Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">Editar punto</h1>
      <ElementoForm
        inicial={{
          id: e.id,
          tipo: e.tipo as "valvula",
          nombre: e.nombre,
          lat: e.lat,
          lng: e.lng,
          precisionM: e.precisionM,
          altitudM: e.altitudM,
          estado: e.estado as "operativo",
          datos: e.datos as Record<string, string | number>,
          observaciones: e.observaciones,
        }}
      />
    </div>
  );
}
