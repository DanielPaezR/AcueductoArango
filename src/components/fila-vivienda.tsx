import { ChevronRight, Droplets, House, TriangleAlert, UsersRound } from "lucide-react";
import Link from "next/link";
import { miniatura } from "@/lib/imagenes";
import { ESTADO_VIVIENDA_LABEL } from "@/lib/opciones";

export type ResumenVivienda = {
  id: string;
  codigo: string | null;
  jefe: string | null;
  personas: number;
  usaAcueducto: boolean;
  autorizacionDatos: boolean;
  estado: string;
  sector?: string | null;
  nombrePredio?: string | null;
  referencia?: string | null;
  fotoPrincipalUrl?: string | null;
};

/** Estado que pinta el zócalo de una vivienda. */
export function zocaloVivienda(v: Pick<ResumenVivienda, "personas" | "autorizacionDatos" | "usaAcueducto">) {
  if (v.personas > 0 && !v.autorizacionDatos) return "zocalo-alerta";
  if (v.usaAcueducto) return "zocalo-agua";
  return "zocalo-muro";
}

export function FilaVivienda({ v }: { v: ResumenVivienda }) {
  const sinAutorizacion = v.personas > 0 && !v.autorizacionDatos;
  const lugar = [v.sector, v.nombrePredio, v.referencia].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/viviendas/${v.id}`}
      className={`zocalo ${zocaloVivienda(v)} group flex items-center gap-3.5 rounded-xl border border-stone-200 bg-white p-3 pb-4 transition-colors hover:border-stone-300`}
    >
      {v.fotoPrincipalUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={miniatura(v.fotoPrincipalUrl, 128, 128)!} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
          <House className="size-6" aria-hidden />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[1.05rem] font-bold text-stone-900">{v.jefe ?? "Sin familia registrada"}</div>
        <div className="truncate text-[0.94rem] text-stone-600">{lugar || "Sin referencia"}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600">
          <span className="num font-semibold text-stone-500">{v.codigo}</span>
          <span className="inline-flex items-center gap-1">
            <UsersRound className="size-4" aria-hidden />
            <span className="num">{v.personas}</span>
          </span>
          {v.usaAcueducto && (
            <span className="inline-flex items-center gap-1 font-semibold text-postigo-700">
              <Droplets className="size-4" aria-hidden />
              Acueducto
            </span>
          )}
          {sinAutorizacion && (
            <span className="inline-flex items-center gap-1 font-semibold text-teja-700">
              <TriangleAlert className="size-4" aria-hidden />
              Sin autorización
            </span>
          )}
          {v.estado !== "habitada" && <span className="font-semibold text-ocre-800">{ESTADO_VIVIENDA_LABEL[v.estado]}</span>}
        </div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
