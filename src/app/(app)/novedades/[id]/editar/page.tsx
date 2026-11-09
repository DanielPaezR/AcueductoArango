import { and, eq, isNull } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NovedadForm } from "@/components/novedad-form";
import { db, schema } from "@/db";
import type { CategoriaNovedad, EstadoNovedad } from "@/lib/opciones";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Corregir novedad" };

export default async function EditarNovedad({ params }: PageProps<"/novedades/[id]/editar">) {
  await requerirPermiso("novedades", "editar");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const n = await db.query.novedades.findFirst({ where: and(eq(schema.novedades.id, id), isNull(schema.novedades.deletedAt)) });
  if (!n) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/novedades/${id}`} className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Volver
      </Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">Corregir novedad</h1>
      <NovedadForm
        inicial={{ id: n.id, titulo: n.titulo, descripcion: n.descripcion, categoria: n.categoria as CategoriaNovedad, estado: n.estado as EstadoNovedad, lat: n.lat, lng: n.lng }}
      />
    </div>
  );
}
