import { sql } from "drizzle-orm";
import { Accessibility, ChevronLeft, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { TIPOS_PROYECTO } from "@/lib/ayudas";
import { fechaCorta, pesos } from "@/lib/dinero";
import { historialAyudas } from "@/lib/municipio";
import { edadPersona } from "@/lib/opciones";
import { requerirMunicipio } from "@/lib/session";

export const metadata = { title: "Familia" };

/** Ficha de una familia para la alcaldía: integrantes e historial de ayudas (solo si autorizó compartir con la alcaldía). */
export default async function FamiliaMunicipal({ params }: PageProps<"/municipio/familias/[id]">) {
  const { id } = await params;
  await requerirMunicipio("municipio", "ver", `/municipio/familias/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { rows } = await db.execute<{ codigo: string | null; vereda: string; referencia: string | null; nombre_predio: string | null; autoriza: boolean; pendiente: boolean }>(sql`
    select v.codigo, ve.nombre as vereda, v.referencia, v.nombre_predio, v.autoriza_alcaldia as autoriza, v.info_pendiente as pendiente
    from viviendas v join veredas ve on ve.id = v.vereda_id where v.id = ${id} and v.deleted_at is null`);
  const v = rows[0];
  if (!v) notFound();
  if (!v.autoriza)
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href="/municipio/poblacion" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
          <ChevronLeft className="size-5" aria-hidden />
          Población
        </Link>
        <div className="tarjeta flex gap-3">
          <Lock className="mt-1 size-6 shrink-0 text-stone-500" aria-hidden />
          <p>
            La familia {v.codigo} de la vereda {v.vereda} no ha autorizado compartir sus datos con la alcaldía. Cuenta en las cifras, pero sus datos solo
            los ve su Junta. La autorización se puede renovar en la próxima visita.
          </p>
        </div>
      </div>
    );
  const [{ rows: personas }, ayudas] = await Promise.all([
    db.execute<{ id: string; nombre: string; documento: string | null; telefono: string | null; es_jefe: boolean; fecha_nacimiento: string | null; edad_reportada: number | null; edad_reportada_en: string | null; discapacidad: boolean; tipo_discapacidad: string | null }>(sql`
      select p.id, trim(p.nombres || ' ' || coalesce(p.apellidos, '')) as nombre, p.numero_documento as documento, p.telefono, p.es_jefe_hogar as es_jefe,
        p.fecha_nacimiento::text, p.edad_reportada, p.edad_reportada_en::text, p.discapacidad, p.tipo_discapacidad
      from personas p where p.vivienda_id = ${id} and p.deleted_at is null order by p.es_jefe_hogar desc, p.created_at`),
    historialAyudas(id),
  ]);
  const jefe = personas.find((p) => p.es_jefe) ?? personas[0];
  const total = ayudas.reduce((a, x) => a + Number(x.valor ?? 0), 0);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/municipio/poblacion" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Población
      </Link>
      <div>
        <p className="font-semibold text-stone-600">Vereda {v.vereda} · {v.codigo}</p>
        <h1 className="text-[1.75rem] leading-tight font-bold">{jefe?.nombre ?? "Familia sin integrantes registrados"}</h1>
        {(v.nombre_predio || v.referencia) && <p className="text-stone-700">{[v.nombre_predio, v.referencia].filter(Boolean).join(" · ")}</p>}
      </div>
      <section className="tarjeta">
        <h2 className="mb-2 text-lg font-bold">Integrantes (<span className="num">{personas.length}</span>)</h2>
        <ul className="divide-y divide-stone-100">
          {personas.map((p) => {
            const edad = edadPersona({ fechaNacimiento: p.fecha_nacimiento, edadReportada: p.edad_reportada, edadReportadaEn: p.edad_reportada_en });
            return (
              <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2">
                <span className="flex items-center gap-1.5 font-semibold">
                  {p.nombre}
                  {p.es_jefe && <span className="chip bg-marca-50 px-2 text-marca-800">Cabeza de familia</span>}
                  {p.discapacidad && <Accessibility className="size-4 text-postigo-700" aria-label={`Con discapacidad${p.tipo_discapacidad ? `: ${p.tipo_discapacidad}` : ""}`} />}
                </span>
                <span className="num text-sm text-stone-600">{[edad !== null ? `${edad} años` : "Edad sin dato", p.documento && `C.C. ${p.documento}`, p.telefono].filter(Boolean).join(" · ")}</span>
              </li>
            );
          })}
        </ul>
      </section>
      <section aria-labelledby="ayudas">
        <h2 id="ayudas" className="mb-1 text-lg font-bold">Historial de ayudas</h2>
        <p className="mb-3 text-stone-600">
          <span className="num font-bold">{ayudas.length}</span> entrega(s){total > 0 && <> · valor total <span className="num font-bold">{pesos(total)}</span></>} · de la alcaldía y de su Junta
        </p>
        <ol className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">
          {ayudas.map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
              <span className="num w-24 shrink-0 text-sm text-stone-600">{a.fecha && fechaCorta(a.fecha)}</span>
              <span className="min-w-0 flex-1">
                <Link href={`/municipio/proyectos/${a.proyecto_id}`} className="font-bold hover:underline">{a.proyecto}</Link>
                <span className="block text-sm text-stone-600">
                  {[a.municipal ? a.entidad || "Alcaldía" : "Junta de la vereda", TIPOS_PROYECTO[a.tipo as keyof typeof TIPOS_PROYECTO], a.detalle, a.persona && `para ${a.persona}`, a.registrado_por && `registró ${a.registrado_por}`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              {a.valor && <span className="num font-semibold">{pesos(Number(a.valor))}</span>}
            </li>
          ))}
          {!ayudas.length && <li className="px-4 py-3 text-stone-600">Esta familia no ha recibido ayudas registradas.</li>}
        </ol>
      </section>
    </div>
  );
}
