"use client";

import { useState, useTransition } from "react";
import { aceptarTerminos, logout } from "@/actions/auth";

export function AceptarForm() {
  const [ok, setOk] = useState(false);
  const [pendiente, start] = useTransition();
  return (
    <div className="tarjeta space-y-4">
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-0.5 size-6 shrink-0 accent-marca-700" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span className="font-medium">
          He leído y acepto los términos de uso, la política de datos personales y el compromiso de confidencialidad.
        </span>
      </label>
      <button className="btn-primario w-full" disabled={!ok || pendiente} onClick={() => start(() => aceptarTerminos())}>
        {pendiente ? "Guardando…" : "Aceptar y continuar"}
      </button>
      <form action={logout}>
        <button className="w-full py-2 text-stone-600 underline">No acepto, cerrar sesión</button>
      </form>
    </div>
  );
}
