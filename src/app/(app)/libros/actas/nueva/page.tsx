import { isNull, sql } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { db, schema } from "@/db";
import { hoyBogota } from "@/lib/dinero";
import { requerirPermiso } from "@/lib/session";
import { ActaForm } from "../acta-form";

export const metadata = { title: "Nueva acta" };

export default async function NuevaActa() {
  await requerirPermiso("libro_actas", "crear");
  // Sugiere el número siguiente al mayor número entero registrado
  const [r] = await db
    .select({ max: sql<number | null>`max(nullif(regexp_replace(numero, '\\D', '', 'g'), '')::int)` })
    .from(schema.actas)
    .where(isNull(schema.actas.deletedAt));
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/libros/actas" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Libro de actas
      </Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">Nueva acta</h1>
      <ActaForm hoy={hoyBogota()} sugerido={String((r?.max ?? 0) + 1).padStart(3, "0")} />
    </div>
  );
}
