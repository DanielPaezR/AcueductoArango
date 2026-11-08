"use client";

import { useActionState, useState, useTransition } from "react";
import { agregarCargo, anularCargo, anularPago, cambiarEstadoSuscriptor, registrarPago } from "@/actions/cobros";
import { MEDIO_LABEL, MEDIOS_PAGO, TIPO_CARGO } from "@/lib/dinero";

const Msg = ({ e }: { e?: { error?: string; ok?: string } }) =>
  e?.error ? (
    <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{e.error}</p>
  ) : e?.ok ? (
    <p className="rounded-lg bg-marca-50 px-3 py-2.5 text-marca-800" role="status">{e.ok}</p>
  ) : null;

export function PagoForm({ suscriptorId, cuentas, sugerido, hoy }: { suscriptorId: string; cuentas: { id: number; nombre: string }[]; sugerido: number; hoy: string }) {
  const [estado, accion, pendiente] = useActionState(registrarPago, undefined);
  return (
    <form action={accion} className="space-y-4" key={estado?.ok}>
      <input type="hidden" name="suscriptorId" value={suscriptorId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="valor">Valor pagado</label>
          <input id="valor" name="valor" className="input num text-lg" inputMode="numeric" defaultValue={sugerido > 0 ? sugerido : ""} required />
        </div>
        <div>
          <label className="label" htmlFor="fecha">Fecha</label>
          <input id="fecha" name="fecha" type="date" className="input" defaultValue={hoy} max={hoy} required />
        </div>
        <div>
          <label className="label" htmlFor="medio">Medio</label>
          <select id="medio" name="medio" className="input" defaultValue="efectivo">
            {MEDIOS_PAGO.map((m) => (
              <option key={m} value={m}>{MEDIO_LABEL[m]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cuentaId">Entró a la cuenta</label>
          <select id="cuentaId" name="cuentaId" className="input" defaultValue={cuentas[0]?.id}>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="referencia">Referencia (opcional)</label>
        <input id="referencia" name="referencia" className="input" placeholder="N.º de consignación o transferencia" />
      </div>
      <Msg e={estado} />
      <button className="btn-primario w-full" disabled={pendiente}>{pendiente ? "Registrando…" : "Registrar pago"}</button>
    </form>
  );
}

export function CargoForm({ suscriptorId, hoy }: { suscriptorId: string; hoy: string }) {
  const [estado, accion, pendiente] = useActionState(agregarCargo, undefined);
  return (
    <form action={accion} className="space-y-4" key={estado?.ok}>
      <input type="hidden" name="suscriptorId" value={suscriptorId} />
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" className="input" defaultValue="saldo_inicial">
            {Object.entries(TIPO_CARGO)
              .filter(([k]) => k !== "mensualidad")
              .map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="valorCargo">Valor</label>
          <input id="valorCargo" name="valor" className="input num" inputMode="numeric" required />
        </div>
        <div>
          <label className="label" htmlFor="fechaCargo">Fecha</label>
          <input id="fechaCargo" name="fecha" type="date" className="input" defaultValue={hoy} required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="concepto">Concepto (opcional)</label>
        <input id="concepto" name="concepto" className="input" placeholder="Ej: Deuda de meses anteriores a 2026" />
      </div>
      <Msg e={estado} />
      <button className="btn-secundario w-full" disabled={pendiente}>Agregar cobro</button>
    </form>
  );
}

export function AnularBoton({ id, tipo }: { id: string; tipo: "cargo" | "pago" }) {
  const [pendiente, start] = useTransition();
  return (
    <button
      className="mt-1 block text-sm font-semibold text-teja-700 underline"
      disabled={pendiente}
      onClick={() => {
        const motivo = prompt(tipo === "pago" ? "¿Por qué se anula este pago? También se anula su ingreso en tesorería." : "¿Por qué se anula este cobro?");
        if (motivo) start(() => (tipo === "pago" ? anularPago(id, motivo) : anularCargo(id, motivo)));
      }}
    >
      {pendiente ? "Anulando…" : "Anular"}
    </button>
  );
}

export function EstadoForm({ id, estado, exento }: { id: string; estado: "activo" | "suspendido" | "retirado"; exento: boolean }) {
  const [e, setE] = useState(estado);
  const [x, setX] = useState(exento);
  const [pendiente, start] = useTransition();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {(["activo", "suspendido", "retirado"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={e === v}
            onClick={() => setE(v)}
            className={`btn border px-2 ${e === v ? "border-marca-700 bg-marca-700 text-white" : "border-stone-300 bg-white text-stone-800"}`}
          >
            {v === "activo" ? "Activo" : v === "suspendido" ? "Suspendido" : "Retirado"}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-3">
        <input type="checkbox" className="size-6 accent-marca-700" checked={x} onChange={(ev) => setX(ev.target.checked)} />
        Exento de la mensualidad (no se le genera cobro)
      </label>
      <button className="btn-secundario w-full" disabled={pendiente || (e === estado && x === exento)} onClick={() => start(() => cambiarEstadoSuscriptor(id, e, x))}>
        {pendiente ? "Guardando…" : "Guardar estado"}
      </button>
    </div>
  );
}
