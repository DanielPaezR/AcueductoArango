"use client";

import { Printer } from "lucide-react";

export function BotonImprimir() {
  return (
    <button className="btn-primario" onClick={() => window.print()}>
      <Printer className="size-5" aria-hidden />
      Imprimir o guardar PDF
    </button>
  );
}

export function BotonVolver() {
  return (
    <button className="font-semibold text-marca-700 underline" onClick={() => history.back()}>
      Volver
    </button>
  );
}
