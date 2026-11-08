"use client";

import { useActionState } from "react";
import { crearUsuario } from "@/actions/usuarios";
import { ROLES } from "@/lib/permisos";

export function NuevoUsuarioForm({ puedeSuperadmin }: { puedeSuperadmin: boolean }) {
  const [estado, accion, pendiente] = useActionState(crearUsuario, undefined);
  const v = estado?.valores ?? {};
  return (
    <form action={accion} className="space-y-3" key={JSON.stringify(estado?.valores ?? {})}>
      <div>
        <label className="label">Nombre completo</label>
        <input name="nombre" className="input" defaultValue={v.nombre} required />
      </div>
      <div>
        <label className="label">Usuario (para ingresar)</label>
        <input name="username" className="input" defaultValue={v.username} autoCapitalize="none" placeholder="ej: maria.gomez" required />
      </div>
      <div>
        <label className="label">Teléfono</label>
        <input name="telefono" className="input" defaultValue={v.telefono} inputMode="tel" />
      </div>
      <div>
        <label className="label">Rol</label>
        <select name="rol" className="input" defaultValue={v.rol ?? "encuestador"}>
          {Object.entries(ROLES)
            .filter(([r]) => r !== "superadmin" || puedeSuperadmin)
            .map(([r, l]) => (
              <option key={r} value={r}>{l}</option>
            ))}
        </select>
        <p className="mt-1.5 text-sm text-stone-600">Se aplican los permisos por defecto del rol; luego se pueden ajustar.</p>
      </div>
      <div>
        <label className="label">Contraseña temporal</label>
        <input name="password" className="input" minLength={8} required />
        <p className="mt-1.5 text-sm text-stone-600">El usuario deberá cambiarla la primera vez que entre.</p>
      </div>
      {estado?.error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{estado.error}</p>}
      <button className="btn-primario w-full" disabled={pendiente}>Crear usuario</button>
    </form>
  );
}
