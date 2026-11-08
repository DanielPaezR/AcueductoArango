"use client";

import { useActionState } from "react";
import { cambiarPassword } from "@/actions/auth";

export function CambiarPasswordForm() {
  const [estado, accion, pendiente] = useActionState(cambiarPassword, undefined);
  return (
    <form action={accion} className="space-y-3">
      <div>
        <label className="label">Contraseña actual</label>
        <input name="actual" type="password" className="input" autoComplete="current-password" required />
      </div>
      <div>
        <label className="label">Nueva contraseña</label>
        <input name="nueva" type="password" className="input" autoComplete="new-password" minLength={8} required />
      </div>
      <div>
        <label className="label">Confirmar nueva contraseña</label>
        <input name="confirmar" type="password" className="input" autoComplete="new-password" required />
      </div>
      {estado?.error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{estado.error}</p>}
      {estado?.ok && <p className="rounded-lg bg-marca-50 p-2 text-sm text-marca-800">{estado.ok}</p>}
      <button className="btn-primario" disabled={pendiente}>Guardar</button>
    </form>
  );
}
