"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Camera, CircleCheck, House, TriangleAlert } from "lucide-react";
import { BotonSincronizar } from "@/components/sync-status";
import { dbLocal } from "@/lib/offline/db";

export function Pendientes() {
  const viv = useLiveQuery(() => dbLocal.viviendas.orderBy("guardadoEn").toArray(), []);
  const fotos = useLiveQuery(() => dbLocal.fotos.orderBy("guardadoEn").toArray(), []);

  if (!viv || !fotos) return <div className="tarjeta text-stone-600">Cargando…</div>;

  if (!viv.length && !fotos.length)
    return (
      <div className="tarjeta flex items-center gap-3 text-lg text-stone-700">
        <CircleCheck className="size-7 shrink-0 text-marca-700" aria-hidden />
        Todo está subido. No hay nada pendiente en este teléfono.
      </div>
    );

  const errorFoto = fotos.find((f) => f.error)?.error;
  return (
    <div className="space-y-3">
      <BotonSincronizar />
      {viv.map((p) => (
        <div key={p.id} className="zocalo zocalo-pendiente rounded-xl border border-stone-200 bg-white p-4 pb-5">
          <div className="flex items-center gap-2 font-bold">
            <House className="size-5 text-stone-500" aria-hidden />
            {p.etiqueta}
          </div>
          <div className="mt-0.5 text-stone-600">
            <span className="num">{p.payload.personas.length}</span> persona(s) · guardada el{" "}
            <span className="num">{new Date(p.guardadoEn).toLocaleString("es-CO")}</span>
          </div>
          {p.error && (
            <p className="mt-2 flex gap-1.5 text-teja-700">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              Último intento: {p.error}
            </p>
          )}
        </div>
      ))}
      {fotos.length > 0 && (
        <div className="zocalo zocalo-pendiente rounded-xl border border-stone-200 bg-white p-4 pb-5">
          <div className="flex items-center gap-2 font-bold">
            <Camera className="size-5 text-stone-500" aria-hidden />
            <span className="num">{fotos.length}</span> foto(s) por subir
          </div>
          {errorFoto && (
            <p className="mt-2 flex gap-1.5 text-teja-700">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              Último intento: {errorFoto}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
