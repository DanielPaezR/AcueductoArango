import { ArrowRightLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { pct } from "@/components/municipio/ui";
import { fechaCorta } from "@/lib/dinero";
import { indicadoresPorVereda } from "@/lib/municipio";
import { puede } from "@/lib/permisos";
import { requerirMunicipio } from "@/lib/session";

export const metadata = { title: "Veredas" };

export default async function Veredas({ searchParams }: PageProps<"/municipio/veredas">) {
  const u = await requerirMunicipio("municipio", "ver", "/municipio/veredas");
  const sp = await searchParams;
  const veredas = await indicadoresPorVereda();
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.75rem] leading-tight font-bold">Veredas</h1>
        {puede(u, "municipio_veredas", "crear") && (
          <Link href="/municipio/veredas/nueva" className="btn-primario">
            <Plus className="size-5" aria-hidden />
            Nueva vereda
          </Link>
        )}
      </div>
      {sp.elegir && u.rol === "superadmin" && (
        <p className="rounded-lg bg-postigo-50 px-4 py-3 text-postigo-800 ring-1 ring-postigo-100">
          Para registrar o corregir datos de una vereda, primero entre a ella con <strong>Trabajar en esta vereda</strong>.
        </p>
      )}
      <ul className="space-y-3">
        {veredas.map((v) => (
          <li key={v.id} className={`tarjeta ${v.activa ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Link href={`/municipio/veredas/${v.id}`} className="group min-w-0 flex-1">
                <span className="flex items-center gap-2 text-lg font-bold group-hover:underline">
                  {v.nombre}
                  {!v.activa && <span className="chip bg-stone-200 text-stone-700">Inactiva</span>}
                  <ChevronRight className="size-5 text-stone-400" aria-hidden />
                </span>
                <span className="text-stone-600">
                  {v.presidencia ? `Presidencia: ${v.presidencia}` : "Sin presidencia registrada"}
                  {v.ultima_visita && <> · última visita {fechaCorta(v.ultima_visita)}</>}
                </span>
              </Link>
              {u.rol === "superadmin" && (
                <a href={`/api/vista?vereda=${v.id}`} className="btn-secundario min-h-10 px-3 py-1.5">
                  <ArrowRightLeft className="size-4" aria-hidden />
                  Trabajar en esta vereda
                </a>
              )}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[0.95rem] sm:grid-cols-5">
              {[
                ["Viviendas", `${v.viviendas} de ${v.meta}`],
                ["Censo", `${pct(v.viviendas, v.meta)} %`],
                ["Habitantes", v.habitantes],
                ["Pendientes", v.pendientes],
                ["Usuarios", v.usuarios],
              ].map(([t, n]) => (
                <div key={t as string}>
                  <dt className="text-sm text-stone-600">{t}</dt>
                  <dd className="num font-bold">{n}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-2 h-2 rounded-full bg-stone-100" aria-hidden>
              <div className="h-2 rounded-full bg-marca-600" style={{ width: `${Math.min(100, pct(v.viviendas, v.meta))}%` }} />
            </div>
          </li>
        ))}
        {!veredas.length && <li className="tarjeta text-stone-600">Todavía no hay veredas.</li>}
      </ul>
    </div>
  );
}
