"use client";

import { useActionState } from "react";
import { guardarSector } from "@/actions/viviendas";

export function SectorForm({ sector }: { sector?: { id: number; nombre: string; descripcion: string | null; color: string | null } }) {
  const [estado, accion, pendiente] = useActionState(guardarSector, undefined);
  return (
    <form action={accion} className="flex flex-wrap items-end gap-2" key={sector ? undefined : estado?.ok}>
      {sector && <input type="hidden" name="id" value={sector.id} />}
      <div className="min-w-40 flex-1">
        <label className="label">Nombre</label>
        <input name="nombre" className="input" defaultValue={sector?.nombre} required />
      </div>
      <div className="min-w-40 flex-1">
        <label className="label">Descripción</label>
        <input name="descripcion" className="input" defaultValue={sector?.descripcion ?? ""} />
      </div>
      <div>
        <label className="label">Color</label>
        <input name="color" type="color" className="h-10 w-14 rounded border border-stone-300" defaultValue={sector?.color ?? "#f97316"} />
      </div>
      <button className={sector ? "btn-secundario" : "btn-primario"} disabled={pendiente}>
        {sector ? "Guardar" : "Agregar"}
      </button>
      {estado?.error && <p className="w-full text-sm text-red-700">{estado.error}</p>}
      {estado?.ok && sector && <p className="w-full text-sm text-marca-800">{estado.ok}</p>}
    </form>
  );
}
