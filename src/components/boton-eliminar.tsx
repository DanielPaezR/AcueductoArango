"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";

export function BotonEliminar({ accion, pregunta }: { accion: () => Promise<void>; pregunta: string }) {
  const [pendiente, start] = useTransition();
  return (
    <button className="btn-peligro" disabled={pendiente} onClick={() => confirm(pregunta) && start(() => accion())}>
      <Trash2 className="size-5" aria-hidden />
      {pendiente ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
