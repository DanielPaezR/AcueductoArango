"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CloudOff, CloudUpload, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { dbLocal } from "@/lib/offline/db";
import { sincronizar } from "@/lib/offline/sync";

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

export function usePendientes() {
  return (
    useLiveQuery(
      async () => (await dbLocal.viviendas.count()) + (await dbLocal.operaciones.count()) + (await dbLocal.fotos.count()),
      [],
    ) ?? 0
  );
}

/** Páginas que se guardan en el teléfono para poder trabajar sin señal. */
const PRECARGAR = ["/", "/viviendas/nueva", "/viviendas/pendientes", "/acueducto/punto/nuevo", "/mantenimientos/nuevo"];

/** Motor en segundo plano: registra el service worker y sube pendientes. Montar una sola vez. */
export function SyncMotor() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then((reg) => {
          if (navigator.onLine) reg.active?.postMessage({ tipo: "precargar", urls: PRECARGAR });
        })
        .catch(() => {});
    }
    const sync = () => navigator.onLine && sincronizar();
    window.addEventListener("online", sync);
    const t = setInterval(sync, 60_000);
    const inicial = setTimeout(sync, 1500);
    return () => {
      window.removeEventListener("online", sync);
      clearInterval(t);
      clearTimeout(inicial);
    };
  }, []);
  return null;
}

/** Indicador compacto para la barra verde superior. */
export function SyncIndicador() {
  const enLinea = useEnLinea();
  const pendientes = usePendientes();

  if (pendientes > 0)
    return (
      <Link
        href="/viviendas/pendientes"
        className="chip bg-ocre-100 py-1 text-ocre-800 ring-1 ring-ocre-500/40"
        aria-label={`${pendientes} registros sin subir`}
      >
        <CloudUpload className="size-4" aria-hidden />
        <span className="num">{pendientes}</span> sin subir
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
