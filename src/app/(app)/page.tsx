import { sql } from "drizzle-orm";
import { BookOpen, ChartPie, Droplets, Map, MapPinned, Plus, Wrench } from "lucide-react";
import { db, schema } from "@/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FilaVivienda } from "@/components/fila-vivienda";
import { modulos } from "@/lib/config";
import { resumenInicio } from "@/lib/consultas";
import { pesos } from "@/lib/dinero";
import { saldoJunta } from "@/lib/libro";
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
  const m = await modulos();
  const verRed = m.acueducto && puede(u, "acueducto_red", "ver");
  const verArreglos = m.acueducto && puede(u, "mantenimientos", "ver");
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

  const verNovedades = puede(u, "novedades", "ver");
  const [novedades, libro] = await Promise.all([
    verNovedades
      ? db
          .select({
            pendientes: sql<number>`count(*) filter (where ${schema.novedades.estado} = 'pendiente')::int`,
            enEjecucion: sql<number>`count(*) filter (where ${schema.novedades.estado} = 'en_ejecucion')::int`,
            realizadas: sql<number>`count(*) filter (where ${schema.novedades.estado} = 'realizado')::int`,
          })
          .from(schema.novedades)
          .where(sql`${schema.novedades.deletedAt} is null and not ${schema.novedades.archivado}`)
          .then((x) => x[0])
      : null,
    puede(u, "libro_contable", "ver") ? saldoJunta() : null,
  ]);

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

      {libro && (
        <Link href="/libros/contabilidad" className="tarjeta zocalo zocalo-muro block hover:bg-stone-50" aria-labelledby="libro">
          <h2 id="libro" className="flex items-center gap-2 text-lg font-bold">
            <BookOpen className="size-5 text-marca-700" aria-hidden />
            Libro de contabilidad de la Junta
          </h2>
          {libro.cuentas ? (
            <p className="mt-1 text-[1.05rem] text-stone-700">
              Saldo actual <strong className="num text-2xl text-stone-900">{pesos(libro.saldo)}</strong> ·{" "}
              <span className="num">{libro.asientos}</span> asiento{libro.asientos === 1 ? "" : "s"}
            </p>
          ) : (
            <p className="mt-1 text-stone-700">El libro todavía no se ha abierto.</p>
          )}
        </Link>
      )}

      {novedades && (
        <section className="tarjeta" aria-labelledby="novedades">
          <h2 id="novedades" className="flex items-center gap-2 text-lg font-bold">
            <MapPinned className="size-5 text-marca-700" aria-hidden />
            Novedades y obras
          </h2>
          <p className="mt-1 text-[1.05rem] text-stone-700">
            <strong className="num text-stone-900">{novedades.pendientes}</strong> pendiente{novedades.pendientes === 1 ? "" : "s"} ·{" "}
            <strong className="num text-stone-900">{novedades.enEjecucion}</strong> en ejecución ·{" "}
            <strong className="num text-stone-900">{novedades.realizadas}</strong> realizada{novedades.realizadas === 1 ? "" : "s"} sin archivar
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {puede(u, "novedades", "crear") && (
              <Link href="/novedades/nueva" className="btn-primario">
                <Plus className="size-5" aria-hidden />
                Registrar novedad
              </Link>
            )}
            <Link href="/novedades" className="btn-secundario">
              Ver en el mapa
            </Link>
          </div>
        </section>
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
          {m.acueducto ? (
          <>
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
          </>
          ) : (
            <div className="mt-4 h-4 overflow-hidden rounded-full bg-stone-100 ring-1 ring-stone-200 ring-inset" role="img" aria-label={`${r.viviendas} de una meta de ${META_VIVIENDAS}`}>
              <div className="h-full bg-marca-600" style={{ width: `${Math.min(100, (r.viviendas / META_VIVIENDAS) * 100)}%` }} />
            </div>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-stone-200 pt-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-stone-600">Personas censadas</dt>
              <dd className="num text-xl font-bold">{r.personas}</dd>
            </div>
            {m.acueducto ? (
              <div>
                <dt className="text-sm text-stone-600">Con matrícula de agua</dt>
                <dd className="num text-xl font-bold">{r.conMatricula}</dd>
              </div>
            ) : (
              <div>
                <dt className="text-sm text-stone-600">Con discapacidad</dt>
                <dd className="num text-xl font-bold">{r.conDiscapacidad}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-stone-600">Sin autorización de datos</dt>
              <dd className={`num text-xl font-bold ${r.sinAutorizacion ? "text-teja-700" : ""}`}>{r.sinAutorizacion}</dd>
            </div>
          </dl>
          {puede(u, "poblacion", "ver") && (
            <Link href="/poblacion" className="mt-4 inline-flex items-center gap-2 font-semibold text-marca-700 hover:underline">
              <ChartPie className="size-5" aria-hidden />
              Ver caracterización de la población
            </Link>
          )}
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
