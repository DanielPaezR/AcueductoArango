import { and, eq, isNull } from "drizzle-orm";
import { ChevronLeft, Pencil, Printer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eliminarActa } from "@/actions/libros";
import { BotonEliminar } from "@/components/boton-eliminar";
import { Galeria } from "@/components/fotos-picker";
import { db, schema } from "@/db";
import { fechaLarga } from "@/lib/dinero";
import { adjuntosDe } from "@/lib/libro";
import { TIPOS_ACTA } from "@/lib/opciones";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Acta" };

export default async function VerActa({ params }: PageProps<"/libros/actas/[id]">) {
  const u = await requerirPermiso("libro_actas", "ver");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const a = await db.query.actas.findFirst({ where: and(eq(schema.actas.id, id), isNull(schema.actas.deletedAt)) });
  if (!a) notFound();
  const adjuntos = await adjuntosDe("acta", id);
  const bloque = (t: string, v: string | null) =>
    v ? (
      <section>
        <h2 className="mb-1 font-bold">{t}</h2>
        <p className="whitespace-pre-line text-stone-800">{v}</p>
      </section>
    ) : null;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/libros/actas" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Libro de actas
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem] leading-tight font-bold">Acta N.º {a.numero}</h1>
          <p className="text-stone-700">
            {TIPOS_ACTA[a.tipo as keyof typeof TIPOS_ACTA] ?? a.tipo} · {fechaLarga(a.fecha)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/imprimir/acta/${a.id}`} className="btn-secundario">
            <Printer className="size-5" aria-hidden />
            Imprimir
          </Link>
          {puede(u, "libro_actas", "editar") && (
            <Link href={`/libros/actas/${a.id}/editar`} className="btn-secundario">
              <Pencil className="size-5" aria-hidden />
              Corregir
            </Link>
          )}
        </div>
      </div>
      <div className="tarjeta space-y-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          {[
            ["Hora", [a.horaInicio, a.horaFin].filter(Boolean).join(" a ") || "—"],
            ["Lugar", a.lugar || "—"],
            ["Asistentes", a.asistentes ?? "—"],
            ["Quórum", a.quorum === true ? "Sí" : a.quorum === false ? "No" : "—"],
          ].map(([t, v]) => (
            <div key={t as string}>
              <dt className="text-sm text-stone-600">{t}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        {bloque("Orden del día", a.ordenDelDia)}
        {bloque("Desarrollo", a.desarrollo)}
        {bloque("Decisiones y compromisos", a.decisiones)}
        {(a.presidente || a.secretario) && (
          <p className="text-stone-700">
            {a.presidente && <>Presidió: <strong>{a.presidente}</strong>. </>}
            {a.secretario && <>Secretaría: <strong>{a.secretario}</strong>.</>}
          </p>
        )}
      </div>
      <section className="tarjeta space-y-3">
        <h2 className="text-lg font-bold">Acta firmada</h2>
        {adjuntos.length ? <Galeria adjuntos={adjuntos} /> : <p className="text-stone-600">Todavía no se ha subido la foto del acta firmada.</p>}
      </section>
      {puede(u, "libro_actas", "eliminar") && (
        <div className="flex justify-end">
          <BotonEliminar accion={eliminarActa.bind(null, a.id)} pregunta={`¿Eliminar el acta N.º ${a.numero}? Quedará en la bitácora.`} />
        </div>
      )}
    </div>
  );
}
