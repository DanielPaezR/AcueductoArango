"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CloudOff, CloudUpload, LogIn, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { dbLocal } from "@/lib/offline/db";
import { pedirSubidaEnFondo, sesion, sincronizar } from "@/lib/offline/sync";

function suscribirConexion(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Estado de conexión del navegador. */
export function useEnLinea() {
  return useSyncExternalStore(suscribirConexion, () => navigator.onLine, () => true);
}

/* El service worker sube pendientes por su cuenta (con la app cerrada o abierta) y avisa con un mensaje:
   así se vuelven a contar, porque esos cambios no pasan por Dexie. */
let vuelta = 0;
const oyentesSw = new Set<() => void>();
if (typeof navigator !== "undefined" && "serviceWorker" in navigator)
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.tipo !== "sincronizado") return;
    vuelta++;
    oyentesSw.forEach((f) => f());
  });
const suscribirSw = (f: () => void) => (oyentesSw.add(f), () => void oyentesSw.delete(f));

/** Cambia cada vez que el service worker sube algo (para volver a leer la base local). */
export function useVueltaSw() {
  return useSyncExternalStore(suscribirSw, () => vuelta, () => 0);
}

/** Pendientes por tipo; `total` = todo lo que falta por subir. */
export function useDetallePendientes() {
  const v = useVueltaSw();
  return (
    useLiveQuery(async () => {
      const [casas, otros, fotos] = await Promise.all([dbLocal.viviendas.count(), dbLocal.operaciones.count(), dbLocal.fotos.count()]);
      return { casas, otros, fotos, total: casas + otros + fotos };
    }, [v]) ?? { casas: 0, otros: 0, fotos: 0, total: 0 }
  );
}

export function useSesionVencida() {
  return useSyncExternalStore(sesion.suscribir, sesion.vencida, () => false);
}

export function usePendientes() {
  return useDetallePendientes().total;
}

/** "1 casa y 2 fotos" */
function describir(d: { casas: number; otros: number; fotos: number }) {
  const partes = [
    d.casas && `${d.casas} casa${d.casas === 1 ? "" : "s"}`,
    d.otros && `${d.otros} registro${d.otros === 1 ? "" : "s"} del acueducto`,
    d.fotos && `${d.fotos} foto${d.fotos === 1 ? "" : "s"} o firma${d.fotos === 1 ? "" : "s"}`,
  ].filter(Boolean) as string[];
  return partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}` : (partes[0] ?? "");
}

/** Páginas que se guardan en el teléfono para poder trabajar sin señal. */
const PRECARGAR = ["/", "/viviendas/nueva", "/viviendas/pendientes", "/novedades/nueva", "/acueducto/punto/nuevo", "/mantenimientos/nuevo"];

/** Motor en segundo plano: registra el service worker y sube pendientes. Montar una sola vez. */
export function SyncMotor() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then((reg) => {
          if (!navigator.onLine) return;
          reg.active?.postMessage({ tipo: "precargar", urls: PRECARGAR });
          // El mapa se carga aparte: pedirlo una vez con señal lo deja guardado para usarlo sin ella
          void import("@/components/mapa/selector").catch(() => {});
        })
        .catch(() => {});
    }
    // Que el navegador no borre los pendientes del teléfono cuando le falte espacio
    navigator.storage?.persist?.().catch(() => {});
    void pedirSubidaEnFondo();
    const sync = () => navigator.onLine && sincronizar();
    window.addEventListener("online", sync);
    // Al volver a la app (desde otra app o con la pantalla apagada) se intenta enseguida
    const visible = () => document.visibilityState === "visible" && sync();
    document.addEventListener("visibilitychange", visible);
    const t = setInterval(sync, 60_000);
    const inicial = setTimeout(sync, 1500);
    return () => {
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", visible);
      clearInterval(t);
      clearTimeout(inicial);
    };
  }, []);
  return null;
}

/** Indicador compacto para la barra verde superior. */
export function SyncIndicador() {
  const enLinea = useEnLinea();
  const d = useDetallePendientes();
  const vencida = useSesionVencida();

  if (d.total > 0 && vencida)
    return (
      <Link href="/login" className="chip bg-teja-600 py-1 text-white" aria-label={`Sesión vencida: ${describir(d)} sin subir. Ingrese de nuevo.`}>
        <LogIn className="size-4" aria-hidden />
        Ingrese para subir <span className="num">{d.total}</span>
      </Link>
    );

  if (d.total > 0)
    return (
      <Link
        href="/viviendas/pendientes"
        className="chip bg-ocre-100 py-1 text-ocre-800 ring-1 ring-ocre-500/40"
        title={`Por subir: ${describir(d)}`}
        aria-label={`Por subir: ${describir(d)}`}
      >
        <CloudUpload className={`size-4 ${enLinea ? "animate-pulse" : ""}`} aria-hidden />
        <span className="num">{d.total}</span> por subir
      </Link>
    );

  return (
    <span className="chip bg-white/10 py-1 text-marca-50" role="status">
      {enLinea ? (
        <span className="size-2 rounded-full bg-[#7fd4a0]" aria-hidden />
      ) : (
        <CloudOff className="size-4" aria-hidden />
      )}
      {enLinea ? "En línea" : "Sin señal"}
    </span>
  );
}

/** Botón para subir ahora (pantalla de pendientes y riel de escritorio). */
export function BotonSincronizar({ className = "" }: { className?: string }) {
  const enLinea = useEnLinea();
  const pendientes = usePendientes();
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState<string>();

  const sync = useCallback(async () => {
    setSubiendo(true);
    const r = await sincronizar();
    setSubiendo(false);
    setMensaje(
      r.sesionVencida
        ? "Su sesión venció. Ingrese de nuevo con señal; los datos siguen guardados en el teléfono."
        : r.fallidas
          ? `No se pudo subir todo: ${r.ultimoError}`
          : r.subidas
            ? `Listo: ${r.subidas} registro(s) subidos.`
            : undefined,
    );
  }, []);

  if (!pendientes && !mensaje) return null;
  return (
    <div className={className}>
      {pendientes > 0 && (
        <button className="btn-primario w-full" onClick={sync} disabled={subiendo || !enLinea}>
          <RefreshCw className={`size-5 ${subiendo ? "animate-spin" : ""}`} aria-hidden />
          {!enLinea ? "Esperando señal…" : subiendo ? "Subiendo…" : "Subir ahora"}
        </button>
      )}
      {mensaje && (
        <p className="mt-2 text-sm text-stone-700" role="status">
          {mensaje}
        </p>
      )}
    </div>
  );
}
