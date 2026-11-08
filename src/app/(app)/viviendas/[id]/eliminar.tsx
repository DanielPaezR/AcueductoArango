"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { eliminarVivienda, suprimirDatosPersonales } from "@/actions/viviendas";

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

export function SuprimirDatos({ id }: { id: string }) {
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <>
      <button
        className="btn-peligro"
        disabled={pendiente}
        onClick={() => {
          const motivo = prompt("¿Quién lo pidió, cuándo y por qué medio? (Ej: Rosa Arango, por WhatsApp, 10 de noviembre)");
          if (motivo && confirm("Se borrarán nombres, documentos, teléfonos, edades, fotos y firma de esta familia. No se puede deshacer. ¿Continuar?"))
            start(async () => {
              try {
                await suprimirDatosPersonales(id, motivo);
              } catch (e) {
                setError((e as Error).message);
              }
            });
        }}
      >
        {pendiente ? "Suprimiendo…" : "Suprimir datos personales"}
      </button>
      {error && <p className="mt-1 text-teja-700" role="alert">{error}</p>}
    </>
  );
}
