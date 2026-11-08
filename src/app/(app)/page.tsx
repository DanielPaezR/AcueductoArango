import { sql } from "drizzle-orm";
import { Droplets, Map, Plus, Wrench } from "lucide-react";
import { db, schema } from "@/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FilaVivienda } from "@/components/fila-vivienda";
import { resumenInicio } from "@/lib/consultas";
import { puede } from "@/lib/permisos";
import { requerirUsuario } from "@/lib/session";

/** Meta aproximada del censo (la vereda tiene entre 500 y 700 casas). */
const META_VIVIENDAS = 600;

function saludo() {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: "America/Bogota", hour: "numeric", hour12: false }));
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

export default async function Inicio() {
  const u = await requerirUsuario();
  if (u.debeCambiarPassword) redirect("/cuenta?primera=1");
  const verCenso = puede(u, "censo", "ver");
  const r = verCenso ? await resumenInicio() : null;
  const verRed = puede(u, "acueducto_red", "ver");
  const verArreglos = puede(u, "mantenimientos", "ver");
  const arreglos = verArreglos
    ? (
        await db
          .select({
            abiertos: sql<number>`count(*) filter (where ${schema.mantenimientos.estado} in ('reportado','en_proceso'))::int`,
            urgentes: sql<number>`count(*) filter (where ${schema.mantenimientos.estado} in ('reportado','en_proceso') and ${schema.mantenimientos.prioridad} = 'alta')::int`,
          })
          .from(schema.mantenimientos)
          .where(sql`${schema.mantenimientos.deletedAt} is null`)
      )[0]
    : null;

  const pctAgua = r ? Math.min(100, (r.conAcueducto / META_VIVIENDAS) * 100) : 0;
  const pctOtras = r ? Math.min(100 - pctAgua, ((r.viviendas - r.conAcueducto) / META_VIVIENDAS) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-[1.75rem] leading-tight font-bold">
          {saludo()}, {u.nombre.split(" ")[0]}
        </h1>
        <p className="mt-1 text-lg text-stone-600">Vereda Arango · Concepción</p>
      </div>

      {(puede(u, "censo", "crear") || puede(u, "mapa_usuarios", "ver")) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {puede(u, "censo", "crear") && (
            <Link href="/viviendas/nueva" className="btn-primario min-h-14 text-lg">
              <Plus className="size-6" aria-hidden />
              Registrar visita
            </Link>
          )}
          {puede(u, "mapa_usuarios", "ver") && (
            <Link href="/mapa" className="btn-secundario min-h-14 text-lg">
              <Map className="size-6" aria-hidden />
              Ver mapa de la vereda
            </Link>
          )}
        </div>
      )}

      {(verRed || verArreglos) && (
        <section className="tarjeta" aria-labelledby="acueducto">
          <h2 id="acueducto" className="flex items-center gap-2 text-lg font-bold">
            <Droplets className="size-5 text-postigo-700" aria-hidden />
            Acueducto
          </h2>
          {arreglos && (
            <p className="mt-1 text-[1.05rem] text-stone-700">
              {arreglos.abiertos ? (
                <>
                  Hay <strong className="num text-stone-900">{arreglos.abiertos}</strong> arreglo{arreglos.abiertos === 1 ? "" : "s"} pendiente
                  {arreglos.abiertos === 1 ? "" : "s"}
                  {arreglos.urgentes > 0 && (
                    <>
                      , <strong className="num text-teja-700">{arreglos.urgentes}</strong> con prioridad alta
                    </>
                  )}
                  .
                </>
              ) : (
                "No hay arreglos pendientes."
              )}
            </p>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {puede(u, "mantenimientos", "crear") && (
              <Link href="/mantenimientos/nuevo" className="btn-primario">
                <Wrench className="size-5" aria-hidden />
                Registrar arreglo
              </Link>
            )}
            {verArreglos && (
              <Link href="/mantenimientos" className="btn-secundario">
                Ver pendientes
              </Link>
            )}
            {verRed && (
              <Link href="/acueducto" className="btn-secundario">
                <Map className="size-5" aria-hidden />
                Mapa de la red
              </Link>
            )}
          </div>
        </section>
      )}

      {r && (
        <section className="tarjeta" aria-labelledby="avance">
          <h2 id="avance" className="text-lg font-bold">Avance del censo</h2>
          <p className="mt-1 text-[1.05rem] text-stone-700">
            Van <strong className="num text-stone-900">{r.viviendas}</strong> viviendas visitadas de unas{" "}
            <span className="num">{META_VIVIENDAS}</span>.
          </p>
          <div
            className="mt-4 flex h-4 overflow-hidden rounded-full bg-stone-100 ring-1 ring-stone-200 ring-inset"
            role="img"
            aria-label={`${r.conAcueducto} con acueducto y ${r.viviendas - r.conAcueducto} sin acueducto, de una meta de ${META_VIVIENDAS}`}
          >
            <div className="bg-postigo-600" style={{ width: `${pctAgua}%` }} />
            <div className="bg-marca-600" style={{ width: `${pctOtras}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-700">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-postigo-600" aria-hidden />
              Con acueducto: <strong className="num">{r.conAcueducto}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-marca-600" aria-hidden />
              Sin acueducto: <strong className="num">{r.viviendas - r.conAcueducto}</strong>
            </span>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-stone-200 pt-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-stone-600">Personas censadas</dt>
              <dd className="num text-xl font-bold">{r.personas}</dd>
            </div>
            <div>
              <dt className="text-sm text-stone-600">Con matrícula de agua</dt>
              <dd className="num text-xl font-bold">{r.conMatricula}</dd>
            </div>
            <div>
              <dt className="text-sm text-stone-600">Sin autorización de datos</dt>
              <dd className={`num text-xl font-bold ${r.sinAutorizacion ? "text-teja-700" : ""}`}>{r.sinAutorizacion}</dd>
            </div>
          </dl>
        </section>
      )}

      {r && (
        <section aria-labelledby="recientes">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="recientes" className="text-lg font-bold">Últimas visitas</h2>
            <Link href="/viviendas" className="font-semibold text-marca-700 hover:underline">
              Ver todas
            </Link>
          </div>
          {r.recientes.length ? (
            <div className="space-y-2.5">
              {r.recientes.map((v) => (
                <FilaVivienda key={v.id} v={v} />
              ))}
            </div>
          ) : (
            <div className="tarjeta text-stone-600">
              Todavía no hay visitas. Empiece con <strong>Registrar visita</strong> frente a la primera casa.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
