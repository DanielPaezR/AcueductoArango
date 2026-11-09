"use client";

import { useActionState } from "react";
import { abrirLibro } from "@/actions/libro";

export function AbrirLibroForm({ hoy }: { hoy: string }) {
  const [estado, accion, pendiente] = useActionState(abrirLibro, undefined);
  return (
    <form action={accion} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="nombre">Nombre</label>
          <input id="nombre" name="nombre" className="input" defaultValue="Cuenta de la Junta" required />
        </div>
        <div>
          <label className="label" htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" className="input" defaultValue="banco">
            <option value="banco">Cuenta de banco</option>
            <option value="efectivo">Caja (efectivo)</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="entidad">Banco (si aplica)</label>
          <input id="entidad" name="entidad" className="input" placeholder="Ej: Banco Agrario" />
        </div>
        <div>
          <label className="label" htmlFor="ultimosDigitos">Últimos dígitos</label>
          <input id="ultimosDigitos" name="ultimosDigitos" className="input num" inputMode="numeric" maxLength={6} />
        </div>
        <div>
          <label className="label" htmlFor="saldoInicial">Saldo de hoy</label>
          <input id="saldoInicial" name="saldoInicial" className="input num" inputMode="numeric" placeholder="$ 0" required />
        </div>
        <div>
          <label className="label" htmlFor="fechaSaldoInicial">Fecha del saldo</label>
          <input id="fechaSaldoInicial" name="fechaSaldoInicial" type="date" className="input" defaultValue={hoy} required />
        </div>
      </div>
      {estado?.error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{estado.error}</p>}
      <button className="btn-primario w-full" disabled={pendiente}>{pendiente ? "Abriendo…" : "Abrir el libro"}</button>
    </form>
  );
}
