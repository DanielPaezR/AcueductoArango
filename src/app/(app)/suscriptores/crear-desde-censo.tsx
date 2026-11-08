"use client";

import { useState, useTransition } from "react";
import { crearSuscriptoresDesdeCenso } from "@/actions/cobros";

export function CrearDesdeCenso() {
  const [pendiente, start] = useTransition();
  const [msg, setMsg] = useState<string>();
  return (
    <div className="text-right">
      <button
        className="btn-secundario"
        disabled={pendiente}
        onClick={() =>
          start(async () => {
            const r = await crearSuscriptoresDesdeCenso();
            setMsg(r?.ok ?? r?.error);
          })
        }
      >
        {pendiente ? "Creando…" : "Crear desde el censo"}
      </button>
      {msg && <p className="mt-1 text-sm text-stone-700" role="status">{msg}</p>}
    </div>
  );
}
