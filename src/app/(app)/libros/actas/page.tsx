import { and, desc, isNull, sql } from "drizzle-orm";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { db, schema } from "@/db";
import { fechaCorta } from "@/lib/dinero";
import { TIPOS_ACTA } from "@/lib/opciones";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Libro de actas" };

export default async function Actas() {
  const u = await requerirPermiso("libro_actas", "ver");
  const A = schema.actas;
  const actas = await db
    .select({ id: A.id, numero: A.numero, tipo: A.tipo, fecha: A.fecha, lugar: A.lugar, asistentes: A.asistentes, adjuntos: sql<number>`(select count(*)::int from adjuntos x where x.entidad = 'acta' and x.entidad_id = actas.id and x.deleted_at is null)` })
    .from(A)
    .where(and(isNull(A.deletedAt)))
    .orderBy(desc(A.fecha), desc(A.createdAt));
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/libros" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Libros de la Junta
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.75rem] leading-tight font-bold">Libro de actas</h1>
        {puede(u, "libro_actas", "crear") && (
          <Link href="/libros/actas/nueva" className="btn-primario">
            <Plus className="size-5" aria-hidden />
            Nueva acta
          </Link>
        )}
      </div>
      <ul className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">
        {actas.map((a) => (
          <li key={a.id}>
            <Link href={`/libros/actas/${a.id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-stone-50 sm:px-5">
              <span className="num w-14 shrink-0 text-center text-lg font-bold text-marca-800">{a.numero}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{TIPOS_ACTA[a.tipo as keyof typeof TIPOS_ACTA] ?? a.tipo}</span>
                <span className="text-sm text-stone-600">
                  {[fechaCorta(a.fecha), a.lugar, a.asistentes != null && `${a.asistentes} asistentes`, a.adjuntos ? "con acta escaneada" : "sin escaneo"].filter(Boolean).join(" · ")}
                </span>
              </span>
              <ChevronRight className="size-5 text-stone-400" aria-hidden />
            </Link>
          </li>
        ))}
        {!actas.length && <li className="px-4 py-4 text-stone-600 sm:px-5">Todavía no hay actas registradas.</li>}
      </ul>
    </div>
  );
}
