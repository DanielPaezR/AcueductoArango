"use client";

import { useLiveQuery } from "dexie-react-hooks";
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

/** Páginas que se guardan en el teléfono para poder trabajar sin señal. */
const PRECARGAR = ["/", "/viviendas/nueva", "/viviendas/pendientes"];

export function SyncStatus({ compacto = false }: { compacto?: boolean }) {
  const enLinea = useEnLinea();
  const pendientes =
    useLiveQuery(async () => (await dbLocal.viviendas.count()) + (await dbLocal.fotos.count()), []) ?? 0;
  const [sincronizando, setSincronizando] = useState(false);
  const [mensaje, setMensaje] = useState<string>();

  const sync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSincronizando(true);
    const r = await sincronizar();
    setSincronizando(false);
    if (r.sesionVencida) setMensaje("Sesión vencida: vuelve a ingresar para subir los datos");
    else if (r.fallidas) setMensaje(r.ultimoError);
    else setMensaje(r.subidas ? `${r.subidas} registro(s) subidos` : undefined);
  }, []);

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

    const on = () => sync();
    window.addEventListener("online", on);
    const t = setInterval(() => navigator.onLine && sync(), 60_000);
    const inicial = setTimeout(() => navigator.onLine && sync(), 1500);
    return () => {
      window.removeEventListener("online", on);
      clearInterval(t);
      clearTimeout(inicial);
    };
  }, [sync]);

  const punto = enLinea ? "bg-marca-600" : "bg-amber-500";
  const texto = enLinea ? "En línea" : "Sin señal";

  if (compacto)
    return (
      <Link href="/viviendas/pendientes" className="ml-auto flex items-center gap-2 text-xs text-stone-600">
        <span className={`h-2.5 w-2.5 rounded-full ${punto}`} />
        {pendientes > 0 ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
            {pendientes} sin subir
          </span>
        ) : (
          texto
        )}
      </Link>
    );

  return (
    <div className="mx-3 mb-2 rounded-lg bg-stone-50 p-3 text-xs">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${punto}`} />
        <span className="font-medium text-stone-700">{texto}</span>
        {pendientes > 0 && (
          <Link href="/viviendas/pendientes" className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
            {pendientes} sin subir
          </Link>
        )}
      </div>
      {pendientes > 0 && enLinea && (
        <button onClick={sync} disabled={sincronizando} className="mt-2 w-full rounded-md bg-white py-1.5 font-semibold text-marca-800 ring-1 ring-stone-200">
          {sincronizando ? "Subiendo…" : "Sincronizar ahora"}
        </button>
      )}
      {mensaje && <p className="mt-1 text-stone-500">{mensaje}</p>}
    </div>
  );
}
