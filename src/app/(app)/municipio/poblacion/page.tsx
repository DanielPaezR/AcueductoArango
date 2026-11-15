import { FileSpreadsheet, Lock } from "lucide-react";
import Link from "next/link";
import { gruposPorVereda, personasMunicipio, personasSinAutorizacion } from "@/lib/municipio";
import { GRUPOS_EDAD, type GrupoEdad } from "@/lib/opciones";
import { requerirMunicipio } from "@/lib/session";
import { listarVeredas } from "@/lib/veredas";

export const metadata = { title: "Población del municipio" };

export default async function PoblacionMunicipal({ searchParams }: PageProps<"/municipio/poblacion">) {
  await requerirMunicipio("municipio", "ver", "/municipio/poblacion");
  const sp = await searchParams;
  const vereda = Number(sp.vereda) || undefined;
  const grupo = GRUPOS_EDAD.some((g) => g.id === sp.grupo) ? (sp.grupo as GrupoEdad) : undefined;
  const discapacidad = sp.disc === "si" || undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const filtro = { vereda, grupo, discapacidad };
  const [veredas, grupos, personas, ocultas] = await Promise.all([
    listarVeredas(),
    gruposPorVereda(),
    personasMunicipio({ ...filtro, q }),
    personasSinAutorizacion(filtro),
  ]);
  const qs = new URLSearchParams(Object.entries({ vereda: vereda ? String(vereda) : "", grupo: grupo ?? "", disc: discapacidad ? "si" : "", q }).filter(([, v]) => v)).toString();
  const celda = (vid: number, gid: string | null) => grupos.filter((x) => x.vereda_id === vid && x.grupo === gid).reduce((a, x) => a + x.n, 0);
  const discVereda = (vid: number) => grupos.filter((x) => x.vereda_id === vid).reduce((a, x) => a + x.disc, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-[1.75rem] leading-tight font-bold">Población del municipio</h1>

      <section aria-labelledby="matriz">
        <h2 id="matriz" className="mb-1 text-lg font-bold">Grupos de edad por vereda</h2>
        <p className="mb-3 text-sm text-stone-600">Todas las personas censadas, en cifras. Toque un número para ver el listado.</p>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[48rem] text-[0.93rem]">
            <thead className="bg-stone-50 text-sm text-stone-600">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">Vereda</th>
                {GRUPOS_EDAD.map((g) => (
                  <th key={g.id} className="px-3 py-2.5 text-right font-semibold">
                    {g.label}
                    <span className="block font-normal">{g.rango}</span>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right font-semibold">Sin edad</th>
                <th className="px-3 py-2.5 text-right font-semibold">Discapacidad</th>
              </tr>
            </thead>
            <tbody>
              {veredas.map((v) => (
                <tr key={v.id} className="border-t border-stone-100">
                  <td className="px-3 py-2 font-semibold">{v.nombre}</td>
                  {GRUPOS_EDAD.map((g) => (
                    <td key={g.id} className="num px-3 py-2 text-right">
                      <Link href={`/municipio/poblacion?vereda=${v.id}&grupo=${g.id}`} className="hover:underline">{celda(v.id, g.id)}</Link>
                    </td>
                  ))}
                  <td className="num px-3 py-2 text-right text-stone-600">{celda(v.id, null)}</td>
                  <td className="num px-3 py-2 text-right">
                    <Link href={`/municipio/poblacion?vereda=${v.id}&disc=si`} className="hover:underline">{discVereda(v.id)}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
            {veredas.length > 1 && (
              <tfoot className="border-t-2 border-stone-300 font-bold">
                <tr>
                  <td className="px-3 py-2">Total</td>
                  {GRUPOS_EDAD.map((g) => (
                    <td key={g.id} className="num px-3 py-2 text-right">{veredas.reduce((a, v) => a + celda(v.id, g.id), 0)}</td>
                  ))}
                  <td className="num px-3 py-2 text-right">{veredas.reduce((a, v) => a + celda(v.id, null), 0)}</td>
                  <td className="num px-3 py-2 text-right">{veredas.reduce((a, v) => a + discVereda(v.id), 0)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <section aria-labelledby="listado" className="space-y-3">
        <h2 id="listado" className="text-lg font-bold">Listado de personas</h2>
        <form className="flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Nombre, cédula o código" className="input w-auto flex-[2]" aria-label="Buscar" type="search" />
          <select name="vereda" defaultValue={vereda ?? ""} className="input w-auto flex-1" aria-label="Vereda">
            <option value="">Todas las veredas</option>
            {veredas.map((v) => (
              <option key={v.id} value={v.id}>{v.nombre}</option>
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-stone-700">
            <span className="num font-bold">{personas.length}</span> persona(s) en el listado{personas.length === 500 && " (primeras 500: afine el filtro)"}
          </p>
          <a href={`/api/municipio/excel?${qs}`} className="btn-secundario min-h-11 px-3.5" download>
            <FileSpreadsheet className="size-5" aria-hidden />
            Excel
          </a>
        </div>
        {ocultas > 0 && (
          <p className="flex gap-2 rounded-lg bg-stone-100 px-3 py-2.5 text-stone-700">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <span className="num font-bold">{ocultas}</span> persona(s) más cumplen el filtro, pero su familia aún no autoriza compartir sus datos con la
              alcaldía: cuentan en las cifras y no aparecen con nombre. La Junta puede renovar la autorización en la próxima visita.
            </span>
          </p>
        )}
        <ul className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">
          {personas.map((p) => (
            <li key={p.id} className="px-4 py-3 sm:px-5">
              <Link href={`/municipio/familias/${p.vivienda_id}`} className="font-bold text-stone-900 hover:underline">{p.nombre}</Link>
              <div className="text-sm text-stone-600">
                {[
                  p.vereda,
                  p.edad !== null ? `${p.edad} años` : "Edad sin dato",
                  p.documento && `C.C. ${p.documento}`,
                  p.es_jefe && "Cabeza de familia",
                  p.discapacidad && `Discapacidad${p.tipo_discapacidad ? `: ${p.tipo_discapacidad}` : ""}`,
                  p.telefono,
                  p.codigo,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </li>
          ))}
          {!personas.length && <li className="px-4 py-3 text-stone-600">Nadie en el listado con esos filtros.</li>}
        </ul>
      </section>
    </div>
  );
}
