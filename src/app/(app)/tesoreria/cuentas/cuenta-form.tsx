"use client";

import { useActionState } from "react";
import { crearCuenta } from "@/actions/tesoreria";

export function CuentaForm({ hoy }: { hoy: string }) {
  const [estado, accion, pendiente] = useActionState(crearCuenta, undefined);
  return (
    <form action={accion} className="space-y-4" key={estado?.ok}>
      <div>
        <label className="label" htmlFor="nombre">Nombre</label>
        <input id="nombre" name="nombre" className="input" placeholder="Ej: Cuenta de ahorros del acueducto" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" className="input" defaultValue="banco">
            <option value="banco">Banco</option>
            <option value="efectivo">Efectivo (caja)</option>
            <option value="billetera">Nequi / Daviplata</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="entidad">Banco o entidad</label>
          <input id="entidad" name="entidad" className="input" placeholder="Ej: Bancolombia" />
        </div>
        <div>
          <label className="label" htmlFor="ultimosDigitos">Últimos 4 dígitos</label>
          <input id="ultimosDigitos" name="ultimosDigitos" className="input num" inputMode="numeric" maxLength={6} />
          <p className="mt-1 text-sm text-stone-600">Nunca el número completo: se ve en la página pública.</p>
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
      {estado?.ok && <p className="rounded-lg bg-marca-50 px-3 py-2.5 text-marca-800" role="status">{estado.ok}</p>}
      <button className="btn-primario w-full" disabled={pendiente}>Crear cuenta</button>
    </form>
  );
}
