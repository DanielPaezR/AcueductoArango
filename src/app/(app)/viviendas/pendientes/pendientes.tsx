"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { dbLocal } from "@/lib/offline/db";
import { sincronizar } from "@/lib/offline/sync";

export function Pendientes() {
  const viv = useLiveQuery(() => dbLocal.viviendas.orderBy("guardadoEn").toArray(), []);
  const fotos = useLiveQuery(() => dbLocal.fotos.orderBy("guardadoEn").toArray(), []);
  const [subiendo, setSubiendo] = useState(false);
  const [msg, setMsg] = useState<string>();

  const subir = async () => {
    setSubiendo(true);
    const r = await sincronizar();
    setSubiendo(false);
    setMsg(
      r.sesionVencida
        ? "Tu sesión venció. Ingresa de nuevo (con señal) y vuelve aquí; los datos siguen guardados."
        : r.fallidas
          ? `No se pudo subir todo: ${r.ultimoError}`
          : `Listo: ${r.subidas} registro(s) subidos.`,
    );
  };

  if (!viv || !fotos) return <div className="tarjeta py-10 text-center text-stone-500">Cargando…</div>;

  if (!viv.length && !fotos.length)
    return <div className="tarjeta py-10 text-center text-stone-500">✅ No hay nada pendiente en este teléfono.</div>;

  return (
    <div className="space-y-3">
      <button className="btn-primario w-full" onClick={subir} disabled={subiendo}>
        {subiendo ? "Subiendo…" : "Subir ahora"}
      </button>
      {msg && <p className="rounded-lg bg-stone-100 p-2 text-sm">{msg}</p>}
      {viv.map((p) => (
        <div key={p.id} className="tarjeta p-3 text-sm">
          <div className="font-semibold">🏠 {p.etiqueta}</div>
          <div className="text-stone-500">
            {p.payload.personas.length} persona(s) · guardada {new Date(p.guardadoEn).toLocaleString("es-CO")}
          </div>
          {p.error && <div className="mt-1 text-red-700">Último error: {p.error}</div>}
        </div>
      ))}
      {fotos.length > 0 && (
        <div className="tarjeta p-3 text-sm">
          📷 {fotos.length} foto(s) por subir
          {fotos.find((f) => f.error) && <div className="mt-1 text-red-700">Último error: {fotos.find((f) => f.error)?.error}</div>}
        </div>
      )}
    </div>
  );
}
