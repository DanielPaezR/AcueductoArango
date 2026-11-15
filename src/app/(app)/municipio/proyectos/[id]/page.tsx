import { sql } from "drizzle-orm";
import { ChevronLeft, Search } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Barras } from "@/components/municipio/ui";
import { db } from "@/db";
import { ESTADOS_PROYECTO, TIPOS_PROYECTO } from "@/lib/ayudas";
import { fechaCorta, hoyBogota, pesos } from "@/lib/dinero";
import { familiasElegibles } from "@/lib/municipio";
import { puede } from "@/lib/permisos";
import { requerirMunicipio } from "@/lib/session";
import { listarVeredas } from "@/lib/veredas";
import { BeneficiarioForm, CuposForm, EstadoProyectoBotones, QuitarBeneficiario } from "../forms";

export const metadata = { title: "Proyecto" };

export default async function ProyectoMunicipal({ params, searchParams }: PageProps<"/municipio/proyectos/[id]">) {
  const { id } = await params;
  const u = await requerirMunicipio("municipio_ayudas", "ver", `/municipio/proyectos/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const veredaFiltro = Number(sp.vereda) || undefined;
  const { rows: pr } = await db.execute<{ id: string; nombre: string; tipo: string; entidad: string | null; descripcion: string | null; estado: string; fecha_inicio: string | null; fecha_fin: string | null; vereda: string | null; cupo_familias: number | null }>(
    sql`select pr.*, pr.fecha_inicio::text, pr.fecha_fin::text, ve.nombre as vereda from proyectos pr left join veredas ve on ve.id = pr.vereda_id where pr.id = ${id} and pr.deleted_at is null`,
  );
  const p = pr[0];
  if (!p) notFound();
  const municipal = !p.vereda;
  const puedeRegistrar = municipal && p.estado === "activo" && puede(u, "municipio_ayudas", "crear");
  const [{ rows: filas }, veredas, elegibles] = await Promise.all([
    db.execute<{ id: string; fecha: string | null; detalle: string | null; valor: string | null; vivienda_id: string; codigo: string | null; vereda: string; jefe: string | null; autoriza: boolean; registro: string | null }>(sql`
      select pa.id, pa.fecha::text, pa.detalle, pa.valor_estimado as valor, v.id as vivienda_id, v.codigo, ve.nombre as vereda, v.autoriza_alcaldia as autoriza,
        case when v.autoriza_alcaldia then (select trim(pe.nombres || ' ' || coalesce(pe.apellidos, '')) from personas pe
          where pe.vivienda_id = v.id and pe.deleted_at is null order by pe.es_jefe_hogar desc, pe.created_at limit 1) end as jefe,
        coalesce(u.cargo, u.nombre) as registro
      from participaciones pa join viviendas v on v.id = pa.vivienda_id join veredas ve on ve.id = pa.vereda_id
      left join usuarios u on u.id = pa.created_by
      where pa.proyecto_id = ${id} and pa.deleted_at is null order by pa.created_at desc`),
    listarVeredas(),
    puedeRegistrar && (q || veredaFiltro) ? familiasElegibles(q, veredaFiltro) : Promise.resolve([]),
  ]);
  const { rows: cuposFilas } = await db.execute<{ vereda_id: number; cupo: number }>(sql`select vereda_id, cupo from proyecto_cupos where proyecto_id = ${id}`);
  const cupos = Object.fromEntries(cuposFilas.map((c) => [c.vereda_id, c.cupo])) as Record<number, number>;
  const usadasPor = (nombre: string) => new Set(filas.filter((f) => f.vereda === nombre).map((f) => f.vivienda_id)).size;
  const conCupo = municipal && p.cupo_familias !== null;
  const porVereda = [...new Set(filas.map((f) => f.vereda))].map((v) => ({ etiqueta: v, valor: new Set(filas.filter((f) => f.vereda === v).map((f) => f.vivienda_id)).size }));
  const total = filas.reduce((a, f) => a + Number(f.valor ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/municipio/proyectos" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Proyectos y ayudas
      </Link>
      <header>
        <p className="font-semibold text-stone-600">{[municipal ? p.entidad || "Alcaldía" : `Vereda ${p.vereda}`, TIPOS_PROYECTO[p.tipo as keyof typeof TIPOS_PROYECTO]].filter(Boolean).join(" · ")}</p>
        <h1 className="text-[1.75rem] leading-tight font-bold">{p.nombre}</h1>
        <p className="text-stone-700">
          {ESTADOS_PROYECTO[p.estado as keyof typeof ESTADOS_PROYECTO]}
          {p.fecha_inicio && <> · desde {fechaCorta(p.fecha_inicio)}</>}
          {p.fecha_fin && <> hasta {fechaCorta(p.fecha_fin)}</>}
        </p>
        {p.descripcion && <p className="mt-2 whitespace-pre-line">{p.descripcion}</p>}
        {municipal && puede(u, "municipio_ayudas", "editar") && <EstadoProyectoBotones id={p.id} estado={p.estado} />}
      </header>

      <section className="tarjeta">
        <dl className="grid grid-cols-3 gap-4">
          <div>
            <dt className="text-sm text-stone-600">Familias</dt>
            <dd className="num text-xl font-bold">{new Set(filas.map((f) => f.vivienda_id)).size}</dd>
          </div>
          <div>
            <dt className="text-sm text-stone-600">Entregas</dt>
            <dd className="num text-xl font-bold">{filas.length}</dd>
          </div>
          <div>
            <dt className="text-sm text-stone-600">Valor</dt>
            <dd className="num text-xl font-bold">{pesos(total)}</dd>
          </div>
        </dl>
        {porVereda.length > 1 && (
          <div className="mt-4 border-t border-stone-200 pt-4">
            <h2 className="mb-3 font-bold">Familias por vereda</h2>
            <Barras filas={porVereda} />
          </div>
        )}
      </section>

      {municipal && (
        <section className="tarjeta space-y-3" aria-labelledby="cupos">
          <h2 id="cupos" className="text-lg font-bold">Cupos por vereda</h2>
          {conCupo ? (
            <>
              <p className="text-stone-700">
                Se ayudará a <strong className="num">{p.cupo_familias}</strong> familias. Cada Junta solo puede registrar las de su cupo.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-[0.95rem]">
                  <thead className="text-left text-sm text-stone-600">
                    <tr>
                      <th className="py-1.5 font-semibold">Vereda</th>
                      <th className="py-1.5 text-right font-semibold">Cupo</th>
                      <th className="py-1.5 text-right font-semibold">Registradas</th>
                      <th className="py-1.5 text-right font-semibold">Disponibles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {veredas.map((v) => {
                      const cupo = cupos[v.id] ?? 0;
                      const usadas = usadasPor(v.nombre);
                      return (
                        <tr key={v.id} className="border-t border-stone-100">
                          <td className="py-1.5">{v.nombre}</td>
                          <td className="num py-1.5 text-right">{cupo}</td>
                          <td className="num py-1.5 text-right">{usadas}</td>
                          <td className={`num py-1.5 text-right font-bold ${cupo - usadas <= 0 ? "text-stone-500" : ""}`}>{Math.max(0, cupo - usadas)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-stone-700">Sin límite: cada Junta puede registrar las familias que necesite.</p>
          )}
          {puede(u, "municipio_ayudas", "editar") && p.estado === "activo" && (
            <details className="rounded-lg border border-stone-200 p-3">
              <summary className="cursor-pointer font-semibold">{conCupo ? "Cambiar el total o el reparto" : "Fijar cuántas familias y repartirlas"}</summary>
              <div className="mt-3">
                <CuposForm proyectoId={p.id} total={p.cupo_familias} cupos={cupos} veredas={veredas.map((v) => ({ id: v.id, nombre: v.nombre, usadas: usadasPor(v.nombre) }))} />
              </div>
            </details>
          )}
        </section>
      )}

      {puedeRegistrar && (
        <section className="tarjeta space-y-4" aria-labelledby="registrar">
          <h2 id="registrar" className="text-lg font-bold">Registrar familia beneficiaria</h2>
          <form className="flex flex-wrap gap-2">
            <input name="q" defaultValue={q} placeholder="Nombre, cédula o código de la casa" className="input w-auto flex-[2]" type="search" aria-label="Buscar familia" />
            <select name="vereda" defaultValue={veredaFiltro ?? ""} className="input w-auto flex-1" aria-label="Vereda">
              <option value="">Todas las veredas</option>
              {veredas.map((v) => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
            <button className="btn-secundario">
              <Search className="size-5" aria-hidden />
              Buscar
            </button>
          </form>
          {(q || veredaFiltro) && !elegibles.length && <p className="text-stone-600">No se encontraron familias con autorización para la alcaldía.</p>}
          <BeneficiarioForm
            proyectoId={p.id}
            hoy={hoyBogota()}
            familias={elegibles.map((f) => ({ id: f.id, label: `${f.jefe ?? "Sin nombre"}${f.documento ? ` · C.C. ${f.documento}` : ""} · ${f.vereda} · ${f.codigo}` }))}
          />
          <p className="text-sm text-stone-600">
            Solo aparecen las familias que autorizaron compartir sus datos con la alcaldía. Las demás las puede registrar su propia Junta en este mismo proyecto.
          </p>
        </section>
      )}

      <section aria-labelledby="lista">
        <h2 id="lista" className="mb-3 text-lg font-bold">Entregas registradas</h2>
        <ul className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">
          {filas.map((f) => (
            <li key={f.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                {f.autoriza ? (
                  <Link href={`/municipio/familias/${f.vivienda_id}`} className="font-bold hover:underline">{f.jefe ?? "Familia"}</Link>
                ) : (
                  <span className="font-bold text-stone-700">Familia {f.codigo} (sin autorización para la alcaldía)</span>
                )}
                <div className="text-sm text-stone-600">
                  {[`Vereda ${f.vereda}`, f.fecha && fechaCorta(f.fecha), f.detalle, f.registro && `registró: ${f.registro}`].filter(Boolean).join(" · ")}
                </div>
                {municipal && puede(u, "municipio_ayudas", "eliminar") && <QuitarBeneficiario id={f.id} />}
              </div>
              {f.valor && <span className="num font-semibold">{pesos(Number(f.valor))}</span>}
            </li>
          ))}
          {!filas.length && <li className="px-4 py-3 text-stone-600">Todavía no hay entregas registradas.</li>}
        </ul>
      </section>
    </div>
  );
}
