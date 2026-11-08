import { ArrowDownLeft, ArrowUpRight, Paperclip } from "lucide-react";
import { ESTADO_MOVIMIENTO, fechaCorta, pesos } from "@/lib/dinero";
import { miniatura } from "@/lib/imagenes";

export type MovimientoVista = {
  id: string;
  fecha: string;
  tipo: string;
  categoria: string;
  concepto: string;
  valor: string;
  estado: string;
  origen: string;
  cargoRegistro: string | null;
  cargoAprobacion: string | null;
  motivo: string | null;
  cuenta: string;
  soportes: { url: string }[];
};

const ZOCALO: Record<string, string> = {
  pendiente: "zocalo-pendiente",
  aprobado: "zocalo-muro",
  rechazado: "zocalo-alerta",
  anulado: "zocalo-alerta",
};

export function FilaMovimiento({
  m,
  mostrarCuenta = false,
  acciones,
}: {
  m: MovimientoVista;
  mostrarCuenta?: boolean;
  acciones?: React.ReactNode;
}) {
  const ingreso = m.tipo === "ingreso";
  const tachado = m.estado === "anulado" || m.estado === "rechazado";
  return (
    <li className={`zocalo ${ZOCALO[m.estado]} rounded-xl border border-stone-200 bg-white p-4 pb-5`}>
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full ${
            ingreso ? "bg-marca-50 text-marca-700" : "bg-stone-100 text-stone-700"
          }`}
          aria-hidden
        >
          {ingreso ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-bold text-stone-900">{m.categoria}</span>
            <span className={`num text-lg font-bold ${tachado ? "text-stone-500 line-through" : ingreso ? "text-marca-700" : "text-stone-900"}`}>
              {ingreso ? "+" : "−"} {pesos(m.valor)}
            </span>
          </div>
          <p className="text-stone-700">{m.concepto}</p>
          <p className="mt-1 text-sm text-stone-600">
            <span className="num">{fechaCorta(m.fecha)}</span>
            {mostrarCuenta && <> · {m.cuenta}</>}
            {m.cargoRegistro && <> · Registró: {m.cargoRegistro}</>}
            {m.estado === "aprobado" && m.cargoAprobacion && <> · Aprobó: {m.cargoAprobacion}</>}
          </p>
          {m.estado !== "aprobado" && (
            <p className={`mt-1.5 text-sm font-semibold ${m.estado === "pendiente" ? "text-ocre-800" : "text-teja-700"}`}>
              {ESTADO_MOVIMIENTO[m.estado]}
              {m.motivo ? `: ${m.motivo}` : ""}
            </p>
          )}
          {m.soportes.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Paperclip className="size-4 text-stone-500" aria-label="Soportes" />
              {m.soportes.map((s, i) => (
                <a key={s.url} href={s.url} target="_blank" rel="noreferrer" aria-label={`Ver soporte ${i + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={miniatura(s.url, 112, 112)!} alt="" className="size-14 rounded-lg object-cover ring-1 ring-stone-200" />
                </a>
              ))}
            </div>
          )}
          {acciones}
        </div>
      </div>
    </li>
  );
}
