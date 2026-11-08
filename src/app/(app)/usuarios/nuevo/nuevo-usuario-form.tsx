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
        <p className="mt-1 text-xs text-stone-500">Se aplican los permisos por defecto del rol; luego puedes ajustarlos.</p>
      </div>
      <div>
        <label className="label">Contraseña temporal</label>
        <input name="password" className="input" minLength={8} required />
        <p className="mt-1 text-xs text-stone-500">El usuario deberá cambiarla la primera vez que entre.</p>
      </div>
      {estado?.error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{estado.error}</p>}
      <button className="btn-primario w-full" disabled={pendiente}>Crear usuario</button>
    </form>
  );
}
