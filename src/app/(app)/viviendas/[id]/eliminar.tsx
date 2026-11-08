"use client";

import { useTransition } from "react";
import { eliminarVivienda } from "@/actions/viviendas";

export function EliminarVivienda({ id }: { id: string }) {
  const [pendiente, start] = useTransition();
  return (
    <button
      className="btn-secundario text-red-700"
      disabled={pendiente}
      onClick={() => confirm("¿Eliminar esta vivienda y su familia del censo?") && start(() => eliminarVivienda(id))}
    >
      Eliminar
    </button>
  );
}
