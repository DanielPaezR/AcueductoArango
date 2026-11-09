import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { fechaLarga } from "@/lib/dinero";
import { datosResponsable } from "@/lib/legal";
import { TIPOS_ACTA } from "@/lib/opciones";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Acta" };

export default async function ImprimirActa({ params }: PageProps<"/imprimir/acta/[id]">) {
  await requerirPermiso("libro_actas", "ver");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const a = await db.query.actas.findFirst({ where: and(eq(schema.actas.id, id), isNull(schema.actas.deletedAt)) });
  if (!a) notFound();
  const r = datosResponsable();
  const bloque = (t: string, v: string | null) =>
    v ? (
      <section className="mt-4 break-inside-avoid-page">
        <h2 className="font-bold uppercase">{t}</h2>
        <p className="whitespace-pre-line">{v}</p>
      </section>
    ) : null;
  return (
    <article className="text-[0.95rem] leading-relaxed">
      <header className="text-center">
        <p className="font-bold uppercase">{r.nombre}</p>
        <p>NIT {r.nit} · {r.municipio}</p>
        <h1 className="mt-2 text-xl font-bold uppercase">Acta N.º {a.numero}</h1>
        <p className="font-semibold">{TIPOS_ACTA[a.tipo as keyof typeof TIPOS_ACTA] ?? a.tipo}</p>
      </header>
      <p className="mt-4">
        Fecha: {fechaLarga(a.fecha)}
        {a.horaInicio && <> · Hora de inicio: {a.horaInicio}</>}
        {a.horaFin && <> · Hora de cierre: {a.horaFin}</>}
        {a.lugar && <> · Lugar: {a.lugar}</>}
        {a.asistentes != null && <> · Asistentes: {a.asistentes}</>}
        {a.quorum != null && <> · Quórum: {a.quorum ? "sí" : "no"}</>}
      </p>
      {bloque("Orden del día", a.ordenDelDia)}
      {bloque("Desarrollo", a.desarrollo)}
      {bloque("Decisiones y compromisos", a.decisiones)}
      <div className="mt-16 grid grid-cols-2 gap-10 break-inside-avoid">
        {[
          ["Presidente(a)", a.presidente],
          ["Secretario(a)", a.secretario],
        ].map(([t, n]) => (
          <div key={t} className="border-t border-stone-800 pt-1 text-center">
            <p className="font-semibold">{n || " "}</p>
            <p>{t}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
