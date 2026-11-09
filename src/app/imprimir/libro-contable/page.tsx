import { fechaCorta, pesos } from "@/lib/dinero";
import { datosResponsable } from "@/lib/legal";
import { datosLibro } from "@/lib/libro";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Libro de contabilidad" };

export default async function ImprimirLibro({ searchParams }: PageProps<"/imprimir/libro-contable">) {
  await requerirPermiso("libro_contable", "ver");
  const sp = await searchParams;
  const anio = sp.anio === "todo" ? undefined : Number(sp.anio) || undefined;
  const d = await datosLibro(anio);
  const r = datosResponsable();
  const c = "border border-stone-500 px-2 py-1 align-top";
  const n = `${c} num text-right whitespace-nowrap`;
  return (
    <article className="text-[0.9rem]">
      <header className="mb-3 text-center">
        <p className="font-bold uppercase">{r.nombre}</p>
        <p>NIT {r.nit} · {r.municipio}</p>
        <h1 className="mt-1 text-xl font-bold uppercase">Libro de contabilidad {anio ?? ""}</h1>
        <p>{d.cuentas.map((x) => [x.nombre, x.entidad, x.ultimos_digitos && `termina en ${x.ultimos_digitos}`].filter(Boolean).join(" · ")).join(" | ")}</p>
      </header>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-stone-100">
            {["N.º", "Fecha", "Concepto", "Comprobante", "Ingresos", "Egresos", "Saldo"].map((t) => (
              <th key={t} className={c}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="font-semibold">
            <td className={c} />
            <td className={c} />
            <td className={c} colSpan={4}>Saldo anterior</td>
            <td className={n}>{pesos(d.saldoAnterior)}</td>
          </tr>
          {d.asientos.map((a) => (
            <tr key={a.id} className="break-inside-avoid">
              <td className={`${c} num`}>{a.numero}</td>
              <td className={`${c} num whitespace-nowrap`}>{fechaCorta(a.fecha)}</td>
              <td className={c}>
                <span className={a.estado === "anulado" ? "line-through" : ""}>{a.concepto}</span>
                {a.estado === "anulado" && <span className="block text-xs">ANULADO: {a.motivo}</span>}
              </td>
              <td className={`${c} num`}>{a.comprobante}</td>
              <td className={n}>{a.tipo === "ingreso" ? pesos(a.valor) : ""}</td>
              <td className={n}>{a.tipo === "egreso" ? pesos(a.valor) : ""}</td>
              <td className={n}>{pesos(a.saldo)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td className={c} colSpan={4}>Totales</td>
            <td className={n}>{pesos(d.ingresos)}</td>
            <td className={n}>{pesos(d.egresos)}</td>
            <td className={n}>{pesos(d.saldoFinal)}</td>
          </tr>
        </tfoot>
      </table>
      <footer className="mt-16 grid grid-cols-3 gap-8 text-center text-sm">
        <div className="border-t border-stone-800 pt-1">Tesorería</div>
        <div className="border-t border-stone-800 pt-1">Presidencia</div>
        <div className="border-t border-stone-800 pt-1">Fiscal</div>
      </footer>
    </article>
  );
}
