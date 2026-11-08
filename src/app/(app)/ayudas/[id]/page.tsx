import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { ESTADOS_PROYECTO, TIPOS_PROYECTO } from "@/lib/ayudas";
import { fechaCorta, hoyBogota, pesos } from "@/lib/dinero";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";
import { EstadoProyecto, ParticipacionForm, QuitarBoton } from "./forms";

export const metadata = { title: "Ayuda o proyecto" };
const { participaciones: PA, viviendas: V, personas: P } = schema;

export default async function Proyecto({ params }: PageProps<"/ayudas/[id]">) {
  const u = await requerirPermiso("ayudas", "ver");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const pr = await db.query.proyectos.findFirst({ where: and(eq(schema.proyectos.id, id), isNull(schema.proyectos.deletedAt)) });
  if (!pr) notFound();
  const jefe = sql<string | null>`(select trim(p.nombres || ' ' || coalesce(p.apellidos, '')) from personas p
    where p.vivienda_id = viviendas.id and p.deleted_at is null order by p.es_jefe_hogar desc, p.created_at limit 1)`;
  const [filas, viviendas] = await Promise.all([
    db
      .select({
        id: PA.id,
        fecha: PA.fecha,
        detalle: PA.detalle,
        cantidad: PA.cantidad,
        valor: PA.valorEstimado,
        viviendaId: V.id,
        codigo: V.codigo,
        jefe,
        persona: sql<string | null>`trim(${P.nombres} || ' ' || coalesce(${P.apellidos}, ''))`,
      })
      .from(PA)
      .innerJoin(V, eq(V.id, PA.viviendaId))
      .leftJoin(P, eq(P.id, PA.personaId))
      .where(and(eq(PA.proyectoId, id), isNull(PA.deletedAt)))
      .orderBy(desc(PA.createdAt)),
    puede(u, "ayudas", "crear")
      ? db.select({ id: V.id, codigo: V.codigo, jefe, referencia: V.referencia }).from(V).where(isNull(V.deletedAt)).orderBy(V.codigo)
      : Promise.resolve([]),
  ]);
  const casas = new Set(filas.map((f) => f.viviendaId)).size;
  const valorTotal = filas.reduce((a, f) => a + Number(f.valor ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/ayudas" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Ayudas y proyectos
      </Link>
      <header>
        <p className="font-semibold text-stone-600">
          {[TIPOS_PROYECTO[pr.tipo as keyof typeof TIPOS_PROYECTO], pr.entidad].filter(Boolean).join(" · ")}
        </p>
        <h1 className="text-[1.75rem] leading-tight font-bold">{pr.nombre}</h1>
        <p className="mt-1 text-stone-700">
          {ESTADOS_PROYECTO[pr.estado as keyof typeof ESTADOS_PROYECTO]}
          {pr.fechaInicio && <> · desde <span className="num">{fechaCorta(pr.fechaInicio)}</span></>}
          {pr.fechaFin && <> hasta <span className="num">{fechaCorta(pr.fechaFin)}</span></>}
        </p>
        {pr.descripcion && <p className="mt-2 text-stone-800">{pr.descripcion}</p>}
      </header>

      <section className="tarjeta">
        <dl className="grid grid-cols-3 gap-4">
          <div>
            <dt className="text-sm text-stone-600">Casas</dt>
            <dd className="num text-xl font-bold">{casas}</dd>
          </div>
          <div>
            <dt className="text-sm text-stone-600">Registros</dt>
            <dd className="num text-xl font-bold">{filas.length}</dd>
          </div>
          <div>
            <dt className="text-sm text-stone-600">Valor estimado</dt>
            <dd className="num text-xl font-bold">{pesos(valorTotal)}</dd>
          </div>
        </dl>
        {puede(u, "ayudas", "editar") && <EstadoProyecto id={id} estado={pr.estado as "activo"} />}
      </section>

      {puede(u, "ayudas", "crear") && pr.estado === "activo" && (
        <section className="tarjeta" aria-labelledby="agregar">
          <h2 id="agregar" className="mb-3 text-lg font-bold">Registrar beneficiario o participante</h2>
          <ParticipacionForm
            proyectoId={id}
            hoy={hoyBogota()}
            viviendas={viviendas.map((v) => ({ id: v.id, label: `${v.codigo} · ${v.jefe ?? v.referencia ?? "Sin familia"}` }))}
          />
        </section>
      )}

      <section aria-labelledby="lista">
        <h2 id="lista" className="mb-3 text-lg font-bold">Beneficiarios y participantes</h2>
        {filas.length ? (
          <ul className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">
            {filas.map((f) => (
              <li key={f.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <Link href={`/viviendas/${f.viviendaId}`} className="font-bold text-stone-900 hover:underline">
                    {f.persona || f.jefe || "Sin familia"} <span className="num font-normal text-stone-500">· {f.codigo}</span>
                  </Link>
                  <div className="text-sm text-stone-600">
                    <span className="num">{fechaCorta(f.fecha)}</span>
                    {f.detalle && <> · {f.detalle}</>}
                    {f.cantidad && <> · <span className="num">{Number(f.cantidad)}</span> unid.</>}
                  </div>
                  {puede(u, "ayudas", "eliminar") && <QuitarBoton id={f.id} />}
                </div>
                {f.valor && <span className="num font-semibold">{pesos(f.valor)}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="tarjeta text-stone-600">Nadie registrado todavía.</div>
        )}
      </section>
    </div>
  );
}
