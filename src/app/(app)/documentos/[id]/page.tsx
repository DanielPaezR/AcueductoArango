import { and, eq, isNull } from "drizzle-orm";
import { ChevronLeft, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eliminarDocumento } from "@/actions/libros";
import { BotonEliminar } from "@/components/boton-eliminar";
import { db, schema } from "@/db";
import { fechaLarga } from "@/lib/dinero";
import { adjuntosDe } from "@/lib/libro";
import { CATEGORIAS_DOCUMENTO } from "@/lib/opciones";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";
import { DocumentoForm } from "../documento-form";

export const metadata = { title: "Documento" };

export default async function VerDocumento({ params }: PageProps<"/documentos/[id]">) {
  const u = await requerirPermiso("documentos", "ver");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await db.query.documentos.findFirst({ where: and(eq(schema.documentos.id, id), isNull(schema.documentos.deletedAt)) });
  if (!d) notFound();
  const archivos = await adjuntosDe("documento", id);
  const esPdf = (u: string) => /\.pdf($|\?)/i.test(u);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/documentos" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Documentos
      </Link>
      <div>
        <p className="text-stone-600">{CATEGORIAS_DOCUMENTO[d.categoria as keyof typeof CATEGORIAS_DOCUMENTO]}</p>
        <h1 className="text-[1.75rem] leading-tight font-bold">{d.titulo}</h1>
        {d.fechaDocumento && <p className="text-stone-700">Aprobado el {fechaLarga(d.fechaDocumento)}</p>}
        {d.descripcion && <p className="mt-2 whitespace-pre-line text-stone-700">{d.descripcion}</p>}
      </div>

      <section className="space-y-3">
        {archivos.map((a, i) =>
          esPdf(a.url) ? (
            <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="tarjeta flex items-center gap-3 hover:bg-stone-50">
              <FileText className="size-8 shrink-0 text-teja-700" aria-hidden />
              <span className="flex-1 font-bold">Abrir el PDF{archivos.length > 1 ? ` (${i + 1})` : ""}</span>
            </a>
          ) : (
            <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={`Página ${i + 1}`} className="w-full rounded-lg ring-1 ring-stone-200" loading="lazy" />
              <span className="mt-1 block text-center text-sm text-stone-600">Página {i + 1}</span>
            </a>
          ),
        )}
        {!archivos.length && <p className="tarjeta text-stone-600">Este documento todavía no tiene archivos.</p>}
      </section>

      {puede(u, "documentos", "editar") && (
        <details className="tarjeta">
          <summary className="cursor-pointer font-bold">Corregir datos o agregar páginas</summary>
          <div className="mt-4">
            <DocumentoForm inicial={d} />
          </div>
        </details>
      )}
      {puede(u, "documentos", "eliminar") && (
        <div className="flex justify-end">
          <BotonEliminar accion={eliminarDocumento.bind(null, d.id)} pregunta={`¿Eliminar "${d.titulo}"?`} />
        </div>
      )}
    </div>
  );
}
