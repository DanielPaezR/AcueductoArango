import { asc, isNull, sql } from "drizzle-orm";
import { ChevronRight, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { db, schema } from "@/db";
import { fechaCorta } from "@/lib/dinero";
import { CATEGORIAS_DOCUMENTO } from "@/lib/opciones";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Documentos de la Junta" };

export default async function Documentos() {
  const u = await requerirPermiso("documentos", "ver");
  const D = schema.documentos;
  const docs = await db
    .select({ id: D.id, titulo: D.titulo, categoria: D.categoria, fecha: D.fechaDocumento, archivos: sql<number>`(select count(*)::int from adjuntos x where x.entidad = 'documento' and x.entidad_id = documentos.id and x.deleted_at is null)` })
    .from(D)
    .where(isNull(D.deletedAt))
    .orderBy(asc(D.titulo));
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.75rem] leading-tight font-bold">Documentos de la Junta</h1>
        {puede(u, "documentos", "crear") && (
          <Link href="/documentos/nuevo" className="btn-primario">
            <Plus className="size-5" aria-hidden />
            Subir documento
          </Link>
        )}
      </div>
      {Object.entries(CATEGORIAS_DOCUMENTO).map(([k, titulo]) => {
        const xs = docs.filter((d) => d.categoria === k);
        if (!xs.length && k === "otro") return null;
        return (
          <section key={k} className="space-y-2">
            <h2 className="text-lg font-bold">{titulo}</h2>
            <ul className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">
              {xs.map((d) => (
                <li key={d.id}>
                  <Link href={`/documentos/${d.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50 sm:px-5">
                    <FileText className="size-6 shrink-0 text-marca-700" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{d.titulo}</span>
                      <span className="text-sm text-stone-600">{[d.fecha && fechaCorta(d.fecha), `${d.archivos} archivo(s)`].filter(Boolean).join(" · ")}</span>
                    </span>
                    <ChevronRight className="size-5 text-stone-400" aria-hidden />
                  </Link>
                </li>
              ))}
              {!xs.length && (
                <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-stone-600 sm:px-5">
                  Todavía no se ha subido.
                  {puede(u, "documentos", "crear") && (
                    <Link href={`/documentos/nuevo?categoria=${k}`} className="font-semibold text-marca-700 underline">Subirlo</Link>
                  )}
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
