import { GRUPOS_EDAD, type GrupoEdad } from "@/lib/opciones";
import { datosResponsable } from "@/lib/legal";
import { filtrar, habitantes, jefesAlfabetico, nucleos } from "@/lib/poblacion";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Listado de población" };

export default async function ImprimirPoblacion({ searchParams }: PageProps<"/imprimir/poblacion">) {
  await requerirPermiso("poblacion", "ver");
  const sp = await searchParams;
  const vista = sp.vista === "nucleos" || sp.vista === "filtro" ? sp.vista : "jefes";
  const grupo = GRUPOS_EDAD.find((g) => g.id === sp.grupo);
  const todos = await habitantes();
  const hoy = new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", dateStyle: "long" });
  const titulo =
    vista === "jefes"
      ? "Listado de cabezas de familia"
      : vista === "nucleos"
        ? "Habitantes por núcleo familiar"
        : `Listado de personas${grupo ? ` · ${grupo.label} (${grupo.rango})` : ""}${sp.disc === "si" ? " · con discapacidad" : ""}`;
  const celda = "border border-stone-400 px-2 py-1 text-left align-top";

  return (
    <article className="text-[0.92rem]">
      <header className="mb-4 border-b-2 border-stone-800 pb-2">
        <p className="font-bold">{datosResponsable().nombre}</p>
        <h1 className="text-xl font-bold">{titulo}</h1>
        <p className="text-stone-700">Generado el {hoy} · Documento interno con datos personales: no publicar.</p>
      </header>

      {vista === "jefes" && (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-stone-100">
              {["N.º", "Cabeza de familia", "Cédula", "Edad", "Teléfono", "Sector", "Vivienda"].map((t) => (
                <th key={t} className={celda}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jefesAlfabetico(todos).map((h, i) => (
              <tr key={h.id} className="break-inside-avoid">
                <td className={`${celda} num`}>{i + 1}</td>
                <td className={celda}>{h.nombre}</td>
                <td className={`${celda} num`}>{h.documento}</td>
                <td className={`${celda} num`}>{h.edad ?? ""}</td>
                <td className={`${celda} num`}>{h.telefono}</td>
                <td className={celda}>{h.sector}</td>
                <td className={`${celda} num`}>{h.codigo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {vista === "nucleos" && (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-stone-100">
              {["N.º", "Núcleo familiar / persona", "Documento", "Edad", "Discapacidad"].map((t) => (
                <th key={t} className={celda}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nucleos(todos).map((f, i) =>
              f.miembros.map((m, j) => (
                <tr key={m.id} className={j === 0 ? "border-t-2 border-stone-800" : ""}>
                  <td className={`${celda} num`}>{j === 0 ? i + 1 : ""}</td>
                  <td className={`${celda} ${m.esJefe ? "font-bold" : "pl-6"}`}>
                    {m.nombre}
                    {j === 0 && <span className="font-normal text-stone-600"> · {[f.codigo, f.sector].filter(Boolean).join(" · ")}</span>}
                  </td>
                  <td className={`${celda} num`}>{m.documento}</td>
                  <td className={`${celda} num`}>{m.edad ?? ""}</td>
                  <td className={celda}>{m.discapacidad ? m.tipoDiscapacidad || "Sí" : ""}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      )}

      {vista === "filtro" && (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-stone-100">
              {["N.º", "Nombre", "Edad", "Cabeza de familia", "Sector", "Vivienda"].map((t) => (
                <th key={t} className={celda}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrar(todos, { sector: Number(sp.sector) || undefined, grupo: grupo?.id as GrupoEdad | undefined, discapacidad: sp.disc === "si" ? true : undefined }).map((h, i) => (
              <tr key={h.id}>
                <td className={`${celda} num`}>{i + 1}</td>
                <td className={celda}>{h.nombre}</td>
                <td className={`${celda} num`}>{h.edad ?? ""}</td>
                <td className={celda}>{h.esJefe ? "Sí" : ""}</td>
                <td className={celda}>{h.sector}</td>
                <td className={`${celda} num`}>{h.codigo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  );
}
