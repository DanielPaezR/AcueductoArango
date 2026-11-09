import { and, eq, isNull } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { hoyBogota } from "@/lib/dinero";
import { requerirPermiso } from "@/lib/session";
import { ActaForm } from "../../acta-form";

export const metadata = { title: "Corregir acta" };

export default async function EditarActa({ params }: PageProps<"/libros/actas/[id]/editar">) {
  await requerirPermiso("libro_actas", "editar");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const a = await db.query.actas.findFirst({ where: and(eq(schema.actas.id, id), isNull(schema.actas.deletedAt)) });
  if (!a) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href={`/libros/actas/${id}`} className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Volver al acta
      </Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">Corregir acta N.º {a.numero}</h1>
      <ActaForm hoy={hoyBogota()} inicial={a} />
    </div>
  );
}
