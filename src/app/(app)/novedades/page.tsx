import { Archive, MapPinned, Plus } from "lucide-react";
import Link from "next/link";
import { MapaNovedades } from "@/components/mapa/dinamicos";
import { listarNovedades } from "@/lib/consultas-novedades";
import { fechaCorta } from "@/lib/dinero";
import { CATEGORIAS_NOVEDAD, ESTADOS_NOVEDAD, type CategoriaNovedad, type EstadoNovedad } from "@/lib/opciones";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Novedades y obras" };

const fecha = (d: Date | null) => (d ? fechaCorta(d.toLocaleDateString("en-CA", { timeZone: "America/Bogota" })) : "");

export default async function Novedades({ searchParams }: PageProps<"/novedades">) {
  const u = await requerirPermiso("novedades", "ver");
  const sp = await searchParams;
  const historial = sp.ver === "historial";
  const lista = await listarNovedades(historial);
  const puntos = lista.filter((n) => n.lat !== null && n.lng !== null).map((n) => ({ id: n.id, titulo: n.titulo, categoria: n.categoria, estado: n.estado, lat: n.lat!, lng: n.lng! }));
  const porEstado = Object.keys(ESTADOS_NOVEDAD).map((k) => ({ k, n: lista.filter((x) => x.estado === k).length }));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.75rem] leading-tight font-bold">Novedades y obras</h1>
        {puede(u, "novedades", "crear") && (
          <Link href="/novedades/nueva" className="btn-primario">
            <Plus className="size-5" aria-hidden />
            Nueva novedad
          </Link>
        )}
      </div>

      <nav className="grid grid-cols-2 gap-1 rounded-xl bg-stone-200 p-1" aria-label="Ver">
        {([
          ["", "Activas", MapPinned],
          ["historial", "Historial (archivadas)", Archive],
        ] as const).map(([v, l, Icono]) => {
          const a = (v === "historial") === historial;
          return (
            <Link
              key={v}
              href={v ? `/novedades?ver=${v}` : "/novedades"}
              aria-current={a ? "page" : undefined}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-lg px-2 text-center font-semibold ${a ? "bg-white text-marca-900 shadow-sm" : "text-stone-700"}`}
            >
              <Icono className="size-5" aria-hidden />
              {l}
            </Link>
          );
        })}
      </nav>

      {!historial && (
        <>
          <p className="text-stone-700">
            {porEstado.map((e, i) => (
              <span key={e.k}>
                {i > 0 && " · "}
                <span className="num font-bold">{e.n}</span> {ESTADOS_NOVEDAD[e.k as EstadoNovedad].label.toLowerCase()}
              </span>
            ))}
          </p>
          <div className="h-[22rem] overflow-hidden rounded-xl ring-1 ring-stone-200">
            <MapaNovedades puntos={puntos} />
          </div>
        </>
      )}

      <ul className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">
        {lista.map((n) => {
          const c = CATEGORIAS_NOVEDAD[n.categoria as CategoriaNovedad];
          const e = ESTADOS_NOVEDAD[n.estado as EstadoNovedad];
          return (
            <li key={n.id}>
              <Link href={`/novedades/${n.id}`} className="flex items-start gap-3 px-4 py-3.5 hover:bg-stone-50 sm:px-5">
                <span className="mt-1.5 size-3.5 shrink-0 rounded-full" style={{ background: c?.color }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{n.titulo}</span>
                  <span className="text-sm text-stone-600">
                    {[c?.label, `registrada ${fecha(n.createdAt)}`, n.autor && `por ${n.autor}`, n.fechaRealizado && `realizada ${fechaCorta(n.fechaRealizado)}`, historial && n.archivadoEn && `archivada ${fecha(n.archivadoEn)}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                {e && <span className={`chip shrink-0 ${e.clase}`}>{e.label}</span>}
              </Link>
            </li>
          );
        })}
        {!lista.length && (
          <li className="px-4 py-4 text-stone-600 sm:px-5">{historial ? "Todavía no hay novedades archivadas." : "No hay novedades activas. Registre derrumbes, arreglos de vías, convites o proyectos de la vereda."}</li>
        )}
      </ul>
    </div>
  );
}
