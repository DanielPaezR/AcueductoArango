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
      {estado?.error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{estado.error}</p>}
      {estado?.ok && <p className="rounded-lg bg-marca-50 px-3 py-2.5 text-marca-800" role="status">{estado.ok}</p>}
      <button className="btn-primario" disabled={pendiente}>Guardar</button>
    </form>
  );
}
