"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Camera, CircleCheck, Droplets, House, TriangleAlert, Wrench } from "lucide-react";
import Link from "next/link";
import { BotonSincronizar, useSesionVencida, useVueltaSw } from "@/components/sync-status";
import { dbLocal } from "@/lib/offline/db";

export function Pendientes() {
  const v = useVueltaSw();
  const viv = useLiveQuery(() => dbLocal.viviendas.orderBy("guardadoEn").toArray(), [v]);
  const fotos = useLiveQuery(() => dbLocal.fotos.orderBy("guardadoEn").toArray(), [v]);
  const ops = useLiveQuery(() => dbLocal.operaciones.orderBy("guardadoEn").toArray(), [v]);
  const vencida = useSesionVencida();

  if (!viv || !fotos || !ops) return <div className="tarjeta text-stone-600">Cargando…</div>;

  if (!viv.length && !fotos.length && !ops.length)
    return (
      <div className="tarjeta flex items-center gap-3 text-lg text-stone-700">
        <CircleCheck className="size-7 shrink-0 text-marca-700" aria-hidden />
        Todo está subido. No hay nada pendiente en este teléfono.
      </div>
    );

  const errorFoto = fotos.find((f) => f.error)?.error;
  return (
    <div className="space-y-3">
      {vencida && (
        <div className="rounded-lg bg-teja-50 px-4 py-3 text-teja-700 ring-1 ring-teja-100" role="alert">
          <strong>Su sesión venció.</strong> Lo guardado sigue seguro en este teléfono, pero solo sube cuando vuelva a entrar.{" "}
          <Link href="/login" className="font-bold underline">Ingresar de nuevo</Link>
        </div>
      )}
      <p className="text-stone-600">Se suben solos cuando hay señal, aunque la app esté cerrada. El botón es solo para no esperar.</p>
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
      {ops.map((o) => (
        <div key={o.id} className="zocalo zocalo-pendiente rounded-xl border border-stone-200 bg-white p-4 pb-5">
          <div className="flex items-center gap-2 font-bold">
            {o.tipo === "mantenimiento" ? (
              <Wrench className="size-5 text-stone-500" aria-hidden />
            ) : (
              <Droplets className="size-5 text-stone-500" aria-hidden />
            )}
            {o.etiqueta}
          </div>
          <div className="mt-0.5 text-stone-600">
            Guardado el <span className="num">{new Date(o.guardadoEn).toLocaleString("es-CO")}</span>
          </div>
          {o.error && (
            <p className="mt-2 flex gap-1.5 text-teja-700">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              Último intento: {o.error}
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
