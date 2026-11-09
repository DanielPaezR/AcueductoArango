"use client";

import { Ban, Eye, History, MoreHorizontal, Paperclip, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { anularAsiento, historialAsiento } from "@/actions/libro";
import { fechaCorta, pesos } from "@/lib/dinero";

type Asiento = {
  id: string;
  numero: number;
  fecha: string;
  tipo: "ingreso" | "egreso";
  categoria: string;
  concepto: string;
  comprobante: string | null;
  valor: number;
  estado: string;
  motivo: string | null;
  registro: string | null;
  editado: boolean;
  soportes: { url: string }[];
  saldo: number;
};
type Historial = Awaited<ReturnType<typeof historialAsiento>>;

const CAMPOS: Record<string, string> = { fecha: "Fecha", tipo: "Tipo", categoria: "Categoría", concepto: "Concepto", valor: "Valor", comprobante: "Comprobante" };
const ACCION: Record<string, string> = { crear: "Registró", editar: "Corrigió", anular: "Anuló", aprobar: "Aprobó", rechazar: "Rechazó", adjuntar: "Adjuntó un comprobante" };

function Dialogo({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto w-[min(42rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-stone-900/60"
    >
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-5 py-3">
        <h2 className="text-lg font-bold">{titulo}</h2>
        <button className="rounded-lg p-2 hover:bg-stone-100" onClick={() => ref.current?.close()} aria-label="Cerrar">
          <X className="size-5" />
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
    </dialog>
  );
}

export function LibroTabla({
  asientos,
  saldoAnterior,
  ingresos,
  egresos,
  saldoFinal,
  puedeEditar,
  etiquetaPeriodo,
}: {
  asientos: Asiento[];
  saldoAnterior: number;
  ingresos: number;
  egresos: number;
  saldoFinal: number;
  puedeEditar: boolean;
  etiquetaPeriodo: string;
}) {
  const router = useRouter();
  const [menu, setMenu] = useState<{ a: Asiento; x: number; y: number } | null>(null);
  const [verSoportes, setVerSoportes] = useState<Asiento | null>(null);
  const [historial, setHistorial] = useState<{ a: Asiento; filas: Historial | null } | null>(null);
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!menu) return;
    const cerrar = () => setMenu(null);
    // Al abrir con pulsación larga o clic derecho el navegador puede desplazar un poco la página: no cerrar por eso
    const abierto = Date.now();
    const alDesplazar = () => Date.now() - abierto > 400 && setMenu(null);
    window.addEventListener("click", cerrar);
    window.addEventListener("scroll", alDesplazar, true);
    window.addEventListener("keydown", cerrar);
    return () => {
      window.removeEventListener("click", cerrar);
      window.removeEventListener("scroll", alDesplazar, true);
      window.removeEventListener("keydown", cerrar);
    };
  }, [menu]);

  const abrirMenu = (a: Asiento, x: number, y: number) => setMenu({ a, x: Math.min(x, window.innerWidth - 240), y: Math.min(y, window.innerHeight - 220) });

  const abrirHistorial = (a: Asiento) => {
    setHistorial({ a, filas: null });
    historialAsiento(a.id)
      .then((filas) => setHistorial({ a, filas }))
      .catch((e) => setError((e as Error).message));
  };

  const anular = (a: Asiento) => {
    const motivo = prompt(`¿Por qué se anula el asiento N.º ${a.numero}? Quedará tachado y visible en el libro.`);
    if (!motivo) return;
    start(async () => {
      try {
        await anularAsiento(a.id, motivo);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const celda = "border-b border-stone-200 px-3 py-2.5 align-top";
  const num = `${celda} num text-right whitespace-nowrap`;

  return (
    <>
      {error && (
        <p className="mb-3 rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">
          {error}
        </p>
      )}
      <p className="mb-2 text-sm text-stone-600 print:hidden">
        Clic derecho (o toque largo en el celular) sobre un asiento para ver su comprobante{puedeEditar ? ", su historial o corregirlo." : " o su historial."}
      </p>
      <div className="overflow-x-auto rounded-xl border border-stone-300 bg-white">
        <table className="w-full min-w-[46rem] border-collapse text-[0.95rem]">
          <thead>
            <tr className="bg-marca-800 text-left text-marca-50">
              <th className="px-3 py-2.5 font-semibold">N.º</th>
              <th className="px-3 py-2.5 font-semibold">Fecha</th>
              <th className="px-3 py-2.5 font-semibold">Concepto</th>
              <th className="px-3 py-2.5 font-semibold">Comprobante</th>
              <th className="px-3 py-2.5 text-right font-semibold">Ingresos</th>
              <th className="px-3 py-2.5 text-right font-semibold">Egresos</th>
              <th className="px-3 py-2.5 text-right font-semibold">Saldo</th>
              <th className="w-10 print:hidden" aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            <tr className="bg-stone-50 font-semibold">
              <td className={celda} />
              <td className={celda} />
              <td className={celda} colSpan={4}>Saldo anterior {etiquetaPeriodo}</td>
              <td className={num}>{pesos(saldoAnterior)}</td>
              <td className={`${celda} print:hidden`} />
            </tr>
            {asientos.map((a) => {
              const anulado = a.estado === "anulado";
              const pendienteAp = a.estado === "pendiente" || a.estado === "rechazado";
              return (
                <tr
                  key={a.id}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    abrirMenu(a, e.clientX, e.clientY);
                  }}
                  className={`cursor-context-menu hover:bg-marca-50/60 ${anulado || pendienteAp ? "text-stone-500" : ""}`}
                >
                  <td className={`${celda} num text-stone-600`}>{a.numero}</td>
                  <td className={`${celda} num whitespace-nowrap`}>{fechaCorta(a.fecha)}</td>
                  <td className={celda}>
                    <span className={anulado ? "line-through" : ""}>{a.concepto}</span>
                    <span className="block text-sm text-stone-500">
                      {a.categoria}
                      {a.editado && " · corregido"}
                    </span>
                    {anulado && <span className="block text-sm font-semibold text-teja-700">Anulado: {a.motivo}</span>}
                    {pendienteAp && <span className="block text-sm font-semibold text-ocre-800">{a.estado === "pendiente" ? "Por aprobar" : "Rechazado"}</span>}
                  </td>
                  <td className={`${celda} whitespace-nowrap`}>
                    {a.soportes.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setVerSoportes(a)}
                        className="inline-flex items-center gap-1 font-semibold text-marca-700 underline"
                        title="Ver comprobante"
                      >
                        <Paperclip className="size-4" aria-hidden />
                        {a.comprobante || "Ver"}
                      </button>
                    ) : (
                      <span className="num">{a.comprobante}</span>
                    )}
                  </td>
                  <td className={`${num} ${anulado ? "line-through" : ""}`}>{a.tipo === "ingreso" ? pesos(a.valor) : ""}</td>
                  <td className={`${num} ${anulado ? "line-through" : ""}`}>{a.tipo === "egreso" ? pesos(a.valor) : ""}</td>
                  <td className={`${num} font-semibold text-stone-900`}>{pesos(a.saldo)}</td>
                  <td className={`${celda} px-1 print:hidden`}>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100"
                      aria-label={`Opciones del asiento ${a.numero}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        abrirMenu(a, r.left - 200, r.bottom + 4);
                      }}
                    >
                      <MoreHorizontal className="size-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!asientos.length && (
              <tr>
                <td className={`${celda} text-stone-600`} colSpan={8}>
                  No hay asientos en este periodo.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-stone-100 font-bold">
              <td className="px-3 py-3" colSpan={4}>Totales del periodo</td>
              <td className="num px-3 py-3 text-right whitespace-nowrap">{pesos(ingresos)}</td>
              <td className="num px-3 py-3 text-right whitespace-nowrap">{pesos(egresos)}</td>
              <td className="num px-3 py-3 text-right whitespace-nowrap">{pesos(saldoFinal)}</td>
              <td className="print:hidden" />
            </tr>
          </tfoot>
        </table>
      </div>

      {menu && (
        <div
          role="menu"
          className="fixed z-[2100] w-56 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-xl"
          style={{ left: Math.max(8, menu.x), top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="border-b border-stone-100 px-4 py-2 text-sm text-stone-600">Asiento N.º {menu.a.numero}</p>
          <button
            role="menuitem"
            disabled={!menu.a.soportes.length}
            className="flex min-h-11 w-full items-center gap-2 px-4 text-left hover:bg-stone-50 disabled:text-stone-400"
            onClick={() => (setVerSoportes(menu.a), setMenu(null))}
          >
            <Eye className="size-5" aria-hidden />
            {menu.a.soportes.length ? "Ver comprobante" : "Sin comprobante adjunto"}
          </button>
          <button role="menuitem" className="flex min-h-11 w-full items-center gap-2 px-4 text-left hover:bg-stone-50" onClick={() => (abrirHistorial(menu.a), setMenu(null))}>
            <History className="size-5" aria-hidden />
            Ver historial
          </button>
          {puedeEditar && menu.a.estado !== "anulado" && (
            <>
              <button
                role="menuitem"
                className="flex min-h-11 w-full items-center gap-2 px-4 text-left hover:bg-stone-50"
                onClick={() => router.push(`/libros/contabilidad/${menu.a.id}/editar`)}
              >
                <Pencil className="size-5" aria-hidden />
                Corregir asiento
              </button>
              <button
                role="menuitem"
                disabled={pendiente}
                className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-teja-700 hover:bg-teja-50"
                onClick={() => (anular(menu.a), setMenu(null))}
              >
                <Ban className="size-5" aria-hidden />
                Anular asiento
              </button>
            </>
          )}
        </div>
      )}

      {verSoportes && (
        <Dialogo titulo={`Comprobante del asiento N.º ${verSoportes.numero}`} onCerrar={() => setVerSoportes(null)}>
          <p className="mb-3 text-stone-700">
            {verSoportes.concepto} · <span className="num">{pesos(verSoportes.valor)}</span>
            {verSoportes.comprobante && <> · Comprobante {verSoportes.comprobante}</>}
          </p>
          <div className="space-y-3">
            {verSoportes.soportes.map((s, i) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.url} alt={`Comprobante ${i + 1}`} className="w-full rounded-lg border border-stone-200" />
              </a>
            ))}
          </div>
        </Dialogo>
      )}

      {historial && (
        <Dialogo titulo={`Historial del asiento N.º ${historial.a.numero}`} onCerrar={() => setHistorial(null)}>
          {!historial.filas ? (
            <p className="text-stone-600">Cargando…</p>
          ) : (
            <ol className="space-y-4">
              {historial.filas.map((h, i) => {
                const antes = (h.antes ?? {}) as Record<string, unknown>;
                const despues = (h.despues ?? {}) as Record<string, unknown>;
                const cambios =
                  h.accion === "editar"
                    ? Object.keys(CAMPOS).filter((k) => String(antes[k] ?? "") !== String(despues[k] ?? ""))
                    : [];
                const mostrar = (k: string, v: unknown) => (k === "valor" ? pesos(Number(v)) : k === "fecha" ? fechaCorta(String(v)) : String(v ?? "—"));
                return (
                  <li key={i} className="border-l-4 border-marca-200 pl-3">
                    <p className="font-bold">
                      {ACCION[h.accion] ?? h.accion} · {h.usuario ?? "Usuario"}
                      {h.cargo ? ` (${h.cargo})` : ""}
                    </p>
                    <p className="num text-sm text-stone-600">
                      {new Date(h.fecha).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" })}
                    </p>
                    {cambios.map((k) => (
                      <p key={k} className="text-[0.95rem]">
                        {CAMPOS[k]}: <span className="text-stone-500 line-through">{mostrar(k, antes[k])}</span> → <strong>{mostrar(k, despues[k])}</strong>
                      </p>
                    ))}
                    {h.accion === "editar" && !cambios.length && <p className="text-sm text-stone-600">Guardó sin cambiar los datos.</p>}
                    {h.motivo && <p className="text-[0.95rem]">Motivo: {h.motivo}</p>}
                  </li>
                );
              })}
            </ol>
          )}
        </Dialogo>
      )}
    </>
  );
}
