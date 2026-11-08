"use client";

import { useActionState } from "react";
import { corregirSaldoInicial, crearCuenta, editarCuenta } from "@/actions/tesoreria";

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

type Cuenta = { id: number; nombre: string; entidad: string | null; ultimosDigitos: string | null; activa: boolean; saldoInicial: string };

export function EditarCuentaForm({ c }: { c: Cuenta }) {
  const [estado, accion, pendiente] = useActionState(editarCuenta, undefined);
  const [estadoSaldo, accionSaldo, pendienteSaldo] = useActionState(corregirSaldoInicial, undefined);
  return (
    <div className="mt-3 space-y-5">
      <form action={accion} className="space-y-3">
        <input type="hidden" name="id" value={c.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor={`n${c.id}`}>Nombre</label>
            <input id={`n${c.id}`} name="nombre" className="input" defaultValue={c.nombre} required />
          </div>
          <div>
            <label className="label" htmlFor={`e${c.id}`}>Banco o entidad</label>
            <input id={`e${c.id}`} name="entidad" className="input" defaultValue={c.entidad ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor={`d${c.id}`}>Últimos dígitos</label>
            <input id={`d${c.id}`} name="ultimosDigitos" className="input num" inputMode="numeric" maxLength={6} defaultValue={c.ultimosDigitos ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor={`a${c.id}`}>Estado</label>
            <select id={`a${c.id}`} name="activa" className="input" defaultValue={c.activa ? "si" : "no"}>
              <option value="si">Activa</option>
              <option value="no">Inactiva (ya no se usa)</option>
            </select>
          </div>
        </div>
        {estado?.error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{estado.error}</p>}
        {estado?.ok && <p className="rounded-lg bg-marca-50 px-3 py-2.5 text-marca-800" role="status">{estado.ok}</p>}
        <button className="btn-secundario w-full" disabled={pendiente}>Guardar datos</button>
      </form>
      <form action={accionSaldo} className="space-y-3 border-t border-stone-200 pt-4">
        <input type="hidden" name="id" value={c.id} />
        <p className="font-semibold text-stone-800">Corregir saldo inicial</p>
        <p className="text-sm text-stone-600">Cambia el saldo publicado. Úselo solo para corregir un error de digitación; el motivo queda en la bitácora.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="saldoInicial" className="input num" inputMode="numeric" defaultValue={Number(c.saldoInicial)} aria-label="Saldo inicial" />
          <input name="motivo" className="input" placeholder="Motivo de la corrección" aria-label="Motivo" />
        </div>
        {estadoSaldo?.error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{estadoSaldo.error}</p>}
        {estadoSaldo?.ok && <p className="rounded-lg bg-marca-50 px-3 py-2.5 text-marca-800" role="status">{estadoSaldo.ok}</p>}
        <button className="btn-secundario w-full" disabled={pendienteSaldo}>Corregir saldo</button>
      </form>
    </div>
  );
}
