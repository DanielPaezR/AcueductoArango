import { FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { Alerta, Barras, Cifra, pct } from "@/components/municipio/ui";
import { fechaCorta, haceDias, pesos } from "@/lib/dinero";
import { PLATAFORMA } from "@/lib/legal";
import { gruposPorVereda, indicadoresPorVereda, tiposDiscapacidad } from "@/lib/municipio";
import { GRUPOS_EDAD } from "@/lib/opciones";
import { requerirMunicipio } from "@/lib/session";

export const metadata = { title: "Tablero municipal" };

const sumar = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);

export default async function TableroMunicipal() {
  await requerirMunicipio("municipio", "ver");
  const [todas, grupos, discap] = await Promise.all([indicadoresPorVereda(), gruposPorVereda(), tiposDiscapacidad()]);
  const veredas = todas.filter((v) => v.activa);
  const ids = new Set(veredas.map((v) => v.id));
  const g = grupos.filter((x) => ids.has(x.vereda_id));
  const t = {
    viviendas: sumar(veredas, (v) => v.viviendas),
    meta: sumar(veredas, (v) => v.meta),
    hogares: sumar(veredas, (v) => v.hogares),
    habitantes: sumar(veredas, (v) => v.habitantes),
    disc: sumar(veredas, (v) => v.con_discapacidad),
    mayores: sumar(veredas, (v) => v.mayores),
    menores: sumar(veredas, (v) => v.menores),
    pendientes: sumar(veredas, (v) => v.pendientes),
    novedades: sumar(veredas, (v) => v.novedades_activas),
    obras: sumar(veredas, (v) => v.obras_realizadas_anio),
    ayudas: sumar(veredas, (v) => v.ayudas_anio),
    autorizadas: sumar(veredas, (v) => v.autorizadas_alcaldia),
  };
  const anio = new Date().getFullYear();
  const hace30 = haceDias(30);
  const alertas = veredas.flatMap((v) => [
    ...(!v.presidencia ? [`${v.nombre}: no tiene usuario de presidencia activo.`] : []),
    ...(v.viviendas === 0 ? [`${v.nombre}: todavía no ha registrado viviendas.`] : v.ultima_visita && v.ultima_visita < hace30 ? [`${v.nombre}: sin visitas nuevas desde el ${fechaCorta(v.ultima_visita)}.`] : []),
    ...(!v.ultima_asamblea || Number(v.ultima_asamblea.slice(0, 4)) < anio ? [`${v.nombre}: sin acta de asamblea registrada en ${anio}.`] : []),
    ...(v.pendientes > 0 ? [`${v.nombre}: ${v.pendientes} casa(s) con la encuesta pendiente.`] : []),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-semibold text-stone-600">{PLATAFORMA.alcaldia}</p>
          <h1 className="text-[1.75rem] leading-tight font-bold">Tablero municipal</h1>
          <p className="text-stone-600">
            <span className="num">{veredas.length}</span> vereda(s) en la plataforma · datos al día de hoy
          </p>
        </div>
        <a href="/api/municipio/excel" className="btn-secundario" download>
          <FileSpreadsheet className="size-5" aria-hidden />
          Descargar en Excel
        </a>
      </div>

      <section className="tarjeta" aria-labelledby="cifras">
        <h2 id="cifras" className="sr-only">Cifras del municipio</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          <Cifra titulo="Viviendas censadas" valor={t.viviendas} detalle={`${pct(t.viviendas, t.meta)} % de la meta (${t.meta.toLocaleString("es-CO")})`} href="/municipio/veredas" />
          <Cifra titulo="Habitantes" valor={t.habitantes} detalle={`en ${t.hogares.toLocaleString("es-CO")} hogares`} href="/municipio/poblacion" />
          <Cifra titulo="Adultos mayores (60+)" valor={t.mayores} detalle={`${pct(t.mayores, t.habitantes)} % de la población`} href="/municipio/poblacion?grupo=mayores" />
          <Cifra titulo="Menores de 18 años" valor={t.menores} detalle={`${pct(t.menores, t.habitantes)} % de la población`} />
          <Cifra titulo="Con discapacidad" valor={t.disc} detalle={`${pct(t.disc, t.habitantes)} % de la población`} href="/municipio/poblacion?disc=si" />
          <Cifra titulo="Encuestas pendientes" valor={t.pendientes} detalle="casas por completar" />
          <Cifra titulo="Novedades activas" valor={t.novedades} detalle={`${t.obras} obra(s) realizadas en ${anio}`} href="/municipio/mapa" />
          <Cifra titulo={`Familias con ayudas ${anio}`} valor={t.ayudas} href="/municipio/proyectos" />
          <Cifra titulo="Hogares que autorizan a la alcaldía" valor={t.autorizadas} detalle={`${pct(t.autorizadas, t.viviendas)} % de las viviendas`} />
          <Cifra titulo="Veredas" valor={veredas.length} detalle={todas.length > veredas.length ? `${todas.length - veredas.length} inactiva(s)` : undefined} href="/municipio/veredas" />
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="tarjeta" aria-labelledby="avance">
          <h2 id="avance" className="mb-1 text-lg font-bold">Avance del censo por vereda</h2>
          <p className="mb-4 text-sm text-stone-600">Viviendas registradas frente a la meta de cada vereda.</p>
          {veredas.length ? (
            <Barras
              maximo={100}
              formato={(n) => `${n} %`}
              filas={[...veredas]
                .sort((a, b) => pct(b.viviendas, b.meta) - pct(a.viviendas, a.meta))
                .map((v) => ({ etiqueta: v.nombre, valor: pct(v.viviendas, v.meta), detalle: `(${v.viviendas}/${v.meta})`, href: `/municipio/veredas/${v.id}` }))}
            />
          ) : (
            <p className="text-stone-600">Todavía no hay veredas.</p>
          )}
        </section>

        <section className="tarjeta" aria-labelledby="edades">
          <h2 id="edades" className="mb-1 text-lg font-bold">Población por grupo de edad</h2>
          <p className="mb-4 text-sm text-stone-600">Todas las veredas.</p>
          <Barras
            filas={GRUPOS_EDAD.map((gr) => ({
              etiqueta: `${gr.label} (${gr.rango})`,
              valor: sumar(g.filter((x) => x.grupo === gr.id), (x) => x.n),
              href: `/municipio/poblacion?grupo=${gr.id}`,
            }))}
          />
          {sumar(g.filter((x) => !x.grupo), (x) => x.n) > 0 && (
            <p className="mt-3 text-sm text-stone-600">
              <span className="num">{sumar(g.filter((x) => !x.grupo), (x) => x.n)}</span> persona(s) sin edad registrada.
            </p>
          )}
        </section>
      </div>

      {alertas.length > 0 && (
        <section className="tarjeta" aria-labelledby="alertas">
          <h2 id="alertas" className="mb-2 text-lg font-bold">Para revisar</h2>
          <ul className="space-y-1.5">
            {alertas.slice(0, 15).map((a) => (
              <Alerta key={a}>{a}</Alerta>
            ))}
          </ul>
          {alertas.length > 15 && <p className="mt-2 text-sm text-stone-600">y {alertas.length - 15} más en la ficha de cada vereda.</p>}
        </section>
      )}

      <section aria-labelledby="comparativo">
        <h2 id="comparativo" className="mb-3 text-lg font-bold">Comparativo de veredas</h2>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[56rem] text-[0.93rem]">
            <thead className="bg-stone-50 text-left text-sm text-stone-600">
              <tr>
                {["Vereda", "Viviendas", "Habitantes", "Mayores", "Discapacidad", "Pendientes", "Novedades", "Saldo Junta", `Ingresos ${anio}`, `Egresos ${anio}`, "Última asamblea"].map((h, i) => (
                  <th key={h} className={`px-3 py-2.5 font-semibold ${i ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {veredas.map((v) => (
                <tr key={v.id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                    <Link href={`/municipio/veredas/${v.id}`} className="text-marca-800 hover:underline">{v.nombre}</Link>
                  </td>
                  {[v.viviendas, v.habitantes, v.mayores, v.con_discapacidad, v.pendientes, v.novedades_activas].map((n, i) => (
                    <td key={i} className="num px-3 py-2.5 text-right">{n}</td>
                  ))}
                  {[v.saldo_junta, v.ingresos_anio, v.egresos_anio].map((n, i) => (
                    <td key={`d${i}`} className="num px-3 py-2.5 text-right whitespace-nowrap">{pesos(n)}</td>
                  ))}
                  <td className="num px-3 py-2.5 text-right whitespace-nowrap">{v.ultima_asamblea ? fechaCorta(v.ultima_asamblea) : "—"}</td>
                </tr>
              ))}
            </tbody>
            {veredas.length > 1 && (
              <tfoot className="border-t-2 border-stone-300 font-bold">
                <tr>
                  <td className="px-3 py-2.5">Total</td>
                  {[t.viviendas, t.habitantes, t.mayores, t.disc, t.pendientes, t.novedades].map((n, i) => (
                    <td key={i} className="num px-3 py-2.5 text-right">{n}</td>
                  ))}
                  {[sumar(veredas, (v) => v.saldo_junta), sumar(veredas, (v) => v.ingresos_anio), sumar(veredas, (v) => v.egresos_anio)].map((n, i) => (
                    <td key={`t${i}`} className="num px-3 py-2.5 text-right whitespace-nowrap">{pesos(n)}</td>
                  ))}
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {discap.length > 0 && (
        <section className="tarjeta" aria-labelledby="discap">
          <h2 id="discap" className="mb-1 text-lg font-bold">Tipos de discapacidad reportados</h2>
          <p className="mb-4 text-sm text-stone-600">Dato sensible y voluntario: solo en cifras. Sirve para focalizar programas.</p>
          <Barras filas={discap.map((d) => ({ etiqueta: d.tipo, valor: d.n }))} />
        </section>
      )}
    </div>
  );
}
