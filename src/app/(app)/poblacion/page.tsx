import { Accessibility, FileSpreadsheet, Printer, UsersRound } from "lucide-react";
import Link from "next/link";
import { listarSectores } from "@/lib/consultas";
import { GRUPOS_EDAD, type GrupoEdad } from "@/lib/opciones";
import { filtrar, habitantes, jefesAlfabetico, nucleos, totalHogares } from "@/lib/poblacion";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Población" };

const VISTAS = { jefes: "Cabezas de familia", nucleos: "Por núcleo familiar", filtro: "Filtrar personas" } as const;
type Vista = keyof typeof VISTAS;

export default async function Poblacion({ searchParams }: PageProps<"/poblacion">) {
  await requerirPermiso("poblacion", "ver");
  const sp = await searchParams;
  const vista: Vista = typeof sp.vista === "string" && sp.vista in VISTAS ? (sp.vista as Vista) : "jefes";
  const sector = Number(sp.sector) || undefined;
  const grupo = GRUPOS_EDAD.some((g) => g.id === sp.grupo) ? (sp.grupo as GrupoEdad) : undefined;
  const discapacidad = sp.disc === "si" ? true : undefined;

  const [todos, hogares, sectores] = await Promise.all([habitantes(), totalHogares(), listarSectores()]);
  const conteo = GRUPOS_EDAD.map((g) => ({ ...g, n: todos.filter((h) => h.grupo === g.id).length }));
  const maximo = Math.max(1, ...conteo.map((c) => c.n));
  const conDisc = todos.filter((h) => h.discapacidad).length;
  const sinEdad = todos.filter((h) => h.edad === null).length;

  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base = { vista, sector: sector ? String(sector) : undefined, grupo, disc: discapacidad ? "si" : undefined, ...extra };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    return p.toString();
  };

  const jefes = jefesAlfabetico(todos);
  const familias = nucleos(todos);
  const filtrados = filtrar(todos, { sector, grupo, discapacidad });

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <h1 className="text-[1.75rem] leading-tight font-bold">Población de la vereda</h1>

      <section className="tarjeta" aria-labelledby="resumen">
        <h2 id="resumen" className="sr-only">Resumen</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <div>
            <dt className="text-sm text-stone-600">Hogares</dt>
            <dd className="num text-2xl font-bold">{hogares.hogares}</dd>
          </div>
          <div>
            <dt className="text-sm text-stone-600">Habitantes</dt>
            <dd className="num text-2xl font-bold">{todos.length}</dd>
          </div>
          <div>
            <dt className="text-sm text-stone-600">Personas por hogar</dt>
            <dd className="num text-2xl font-bold">{hogares.hogares ? (todos.length / hogares.hogares).toFixed(1) : "0"}</dd>
          </div>
          <div>
            <dt className="text-sm text-stone-600">Con discapacidad</dt>
            <dd className="num text-2xl font-bold">{conDisc}</dd>
          </div>
        </dl>

        <h3 className="mt-6 mb-2 font-bold">Por grupo de edad</h3>
        <ul className="space-y-2.5">
          {conteo.map((c) => (
            <li key={c.id}>
              <Link href={`/poblacion?vista=filtro&grupo=${c.id}`} className="group block">
                <div className="flex justify-between text-[0.95rem]">
                  <span>
                    <span className="font-semibold group-hover:underline">{c.label}</span> <span className="text-stone-600">({c.rango})</span>
                  </span>
                  <span className="num font-bold">{c.n}</span>
                </div>
                <div className="mt-1 h-3 rounded-full bg-stone-100">
                  <div className="h-3 rounded-full bg-marca-600" style={{ width: `${(c.n / maximo) * 100}%` }} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {sinEdad > 0 && (
          <p className="mt-3 text-sm text-stone-600">
            <span className="num">{sinEdad}</span> persona(s) sin edad registrada.
          </p>
        )}
      </section>

      <nav className="grid grid-cols-3 gap-1 rounded-xl bg-stone-200 p-1" aria-label="Listados">
        {(Object.keys(VISTAS) as Vista[]).map((v) => (
          <Link
            key={v}
            href={`/poblacion?vista=${v}`}
            aria-current={v === vista ? "page" : undefined}
            className={`flex min-h-12 items-center justify-center rounded-lg px-2 text-center text-[0.92rem] leading-tight font-semibold ${
              v === vista ? "bg-white text-marca-900 shadow-sm" : "text-stone-700"
            }`}
          >
            {VISTAS[v]}
          </Link>
        ))}
      </nav>

      {vista === "filtro" && (
        <form className="flex flex-wrap gap-2">
          <input type="hidden" name="vista" value="filtro" />
          <select name="sector" defaultValue={sector ?? ""} className="input w-auto flex-1" aria-label="Sector">
            <option value="">Todos los sectores</option>
            {sectores.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
          <select name="grupo" defaultValue={grupo ?? ""} className="input w-auto flex-1" aria-label="Grupo de edad">
            <option value="">Todas las edades</option>
            {GRUPOS_EDAD.map((g) => (
              <option key={g.id} value={g.id}>{g.label} ({g.rango})</option>
            ))}
          </select>
          <select name="disc" defaultValue={discapacidad ? "si" : ""} className="input w-auto flex-1" aria-label="Discapacidad">
            <option value="">Con y sin discapacidad</option>
            <option value="si">Solo con discapacidad</option>
          </select>
          <button className="btn-secundario">Filtrar</button>
        </form>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-stone-700">
          {vista === "jefes" && <><span className="num font-bold">{jefes.length}</span> cabezas de familia, en orden alfabético</>}
          {vista === "nucleos" && <><span className="num font-bold">{familias.length}</span> núcleos familiares, por cabeza de familia (A–Z)</>}
          {vista === "filtro" && <><span className="num font-bold">{filtrados.length}</span> persona(s)</>}
        </p>
        <div className="flex gap-2">
          <Link href={`/imprimir/poblacion?${qs({})}`} className="btn-secundario min-h-11 px-3.5">
            <Printer className="size-5" aria-hidden />
            Imprimir
          </Link>
          <a href={`/api/reportes/poblacion?${qs({})}`} className="btn-secundario min-h-11 px-3.5" download>
            <FileSpreadsheet className="size-5" aria-hidden />
            Excel
          </a>
        </div>
      </div>

      {vista === "jefes" && (
        <ol className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">
          {jefes.map((h, i) => (
            <li key={h.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className="num w-8 shrink-0 text-right text-stone-500">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <Link href={`/viviendas/${h.viviendaId}`} className="font-bold text-stone-900 hover:underline">{h.nombre}</Link>
                <div className="text-sm text-stone-600">
                  {[h.documento && `C.C. ${h.documento}`, h.edad !== null && `${h.edad} años`, h.telefono, h.sector, h.codigo].filter(Boolean).join(" · ")}
                </div>
              </div>
            </li>
          ))}
          {!jefes.length && <li className="px-4 py-3 text-stone-600">Todavía no hay cabezas de familia registradas.</li>}
        </ol>
      )}

      {vista === "nucleos" && (
        <div className="space-y-3">
          {familias.map((f, i) => (
            <section key={f.viviendaId} className="tarjeta">
              <h3 className="flex flex-wrap items-baseline gap-x-2 font-bold">
                <span className="num text-stone-500">{i + 1}.</span>
                <Link href={`/viviendas/${f.viviendaId}`} className="hover:underline">{f.jefe?.nombre ?? "Hogar sin cabeza de familia"}</Link>
                <span className="text-sm font-normal text-stone-600">
                  {[f.codigo, f.sector, f.referencia].filter(Boolean).join(" · ")} · <span className="num">{f.miembros.length}</span> persona(s)
                </span>
              </h3>
              <ul className="mt-2 divide-y divide-stone-100">
                {f.miembros.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5">
                    <span className="flex items-center gap-1.5">
                      <UsersRound className="size-4 shrink-0 text-stone-400" aria-hidden />
                      {m.nombre}
                      {m.esJefe && <span className="chip bg-marca-50 px-2 text-marca-800">Cabeza de familia</span>}
                      {m.discapacidad && <Accessibility className="size-4 text-postigo-700" aria-label="Con discapacidad" />}
                    </span>
                    <span className="num text-sm text-stone-600">{[m.edad !== null ? `${m.edad} años` : "Edad sin dato", m.documento].filter(Boolean).join(" · ")}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {!familias.length && <div className="tarjeta text-stone-600">Todavía no hay familias registradas.</div>}
        </div>
      )}

      {vista === "filtro" && (
        <ul className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">
          {filtrados.map((h) => (
            <li key={h.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <Link href={`/viviendas/${h.viviendaId}`} className="font-bold text-stone-900 hover:underline">{h.nombre}</Link>
                <div className="text-sm text-stone-600">
                  {[
                    h.edad !== null ? `${h.edad} años` : "Edad sin dato",
                    h.esJefe && "Cabeza de familia",
                    h.discapacidad && `Discapacidad${h.tipoDiscapacidad ? `: ${h.tipoDiscapacidad}` : ""}`,
                    h.sector,
                    h.codigo,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
            </li>
          ))}
          {!filtrados.length && <li className="px-4 py-3 text-stone-600">Nadie cumple con esos filtros.</li>}
        </ul>
      )}
    </div>
  );
}
