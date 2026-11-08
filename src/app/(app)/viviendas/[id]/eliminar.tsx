"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { eliminarVivienda } from "@/actions/viviendas";

export function EliminarVivienda({ id }: { id: string }) {
  const [pendiente, start] = useTransition();
  return (
    <button
      className="btn-peligro"
      disabled={pendiente}
      onClick={() => confirm("¿Eliminar esta vivienda y su familia del censo?") && start(() => eliminarVivienda(id))}
    >
      <Trash2 className="size-5" aria-hidden />
      {pendiente ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
