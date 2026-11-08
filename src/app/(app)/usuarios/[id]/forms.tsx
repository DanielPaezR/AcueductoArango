"use client";

import { useActionState, useState, useTransition } from "react";
import { cambiarEstadoUsuario, editarUsuario, restablecerPassword } from "@/actions/usuarios";
import { accionesDe, ACCIONES, PLANTILLAS, ROLES, SECCIONES, type Accion, type Rol } from "@/lib/permisos";

type U = { id: string; nombre: string; username: string; telefono: string; cargo: string; rol: string; permisos: Record<string, string[]> };

export function EditarUsuarioForm({
  usuario,
  editable,
  esYoMismo,
  puedeSuperadmin,
}: {
  usuario: U;
  editable: boolean;
  esYoMismo: boolean;
  puedeSuperadmin: boolean;
}) {
  const [estado, accion, pendiente] = useActionState(editarUsuario, undefined);
  const [rol, setRol] = useState(usuario.rol as Rol);
  const esSuper = rol === "superadmin";
  const permisos = rol === usuario.rol ? usuario.permisos : (PLANTILLAS[rol] as Record<string, string[]>);

  return (
    <form action={accion} className="space-y-4" key={rol}>
      <input type="hidden" name="id" value={usuario.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Nombre</label>
          <input name="nombre" className="input" defaultValue={usuario.nombre} disabled={!editable} required />
        </div>
        <div>
          <label className="label">Usuario</label>
          <input className="input bg-stone-50" value={usuario.username} disabled readOnly />
        </div>
        <div>
          <label className="label">Teléfono</label>
          <input name="telefono" className="input" defaultValue={usuario.telefono} disabled={!editable} />
        </div>
        <div>
          <label className="label">Cargo en la Junta</label>
          <input name="cargo" className="input" placeholder="Ej: Presidenta, Tesorera, Fontanero" defaultValue={usuario.cargo} disabled={!editable} />
          <p className="mt-1 text-sm text-stone-600">Es lo que aparece en la página pública de cuentas.</p>
        </div>
        <div>
          <label className="label">Rol</label>
          <select
            name="rol"
            className="input"
            value={rol}
            onChange={(e) => setRol(e.target.value as Rol)}
            disabled={!editable || esYoMismo}
          >
            {Object.entries(ROLES)
              .filter(([r]) => r !== "superadmin" || puedeSuperadmin || usuario.rol === "superadmin")
              .map(([r, l]) => (
                <option key={r} value={r}>{l}</option>
              ))}
          </select>
          {esYoMismo && <input type="hidden" name="rol" value={rol} />}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Acceso por sección</h3>
        {esSuper ? (
          <p className="text-sm text-stone-500">El superadministrador tiene acceso total.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-stone-500">
                  <th className="py-2 pr-2">Sección</th>
                  {Object.values(ACCIONES).map((a) => (
                    <th key={a} className="px-2 py-2 text-center">{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(SECCIONES).map(([s, label]) => (
                  <tr key={s} className="border-t border-stone-100">
                    <td className="py-2 pr-2">{label}</td>
                    {(Object.keys(ACCIONES) as Accion[]).map((a) => (
                      <td key={a} className="px-2 py-2 text-center">
                        {accionesDe(s).includes(a) ? (
                        <input
                          type="checkbox"
                          name={`p.${s}.${a}`}
                          defaultChecked={permisos[s]?.includes(a)}
                          disabled={!editable}
                          className="size-6 accent-marca-700"
                          aria-label={`${ACCIONES[a]}: ${label}`}
                        />
                        ) : (
                          <span className="text-stone-300" aria-hidden>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {editable && (
              <label className="mt-3 flex items-center gap-2 text-stone-700">
                <input type="checkbox" name="usarPlantilla" className="h-4 w-4 accent-marca-700" />
                Restablecer a los permisos por defecto del rol
              </label>
            )}
          </div>
        )}
      </div>

      {estado?.error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{estado.error}</p>}
      {estado?.ok && <p className="rounded-lg bg-marca-50 px-3 py-2.5 text-marca-800" role="status">{estado.ok}</p>}
      {editable && <button className="btn-primario" disabled={pendiente}>Guardar cambios</button>}
    </form>
  );
}

export function EstadoUsuarioBoton({ id, activo }: { id: string; activo: boolean }) {
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="text-right">
      <button
        className={activo ? "btn-peligro" : "btn-primario"}
        disabled={pendiente}
        onClick={() =>
          start(async () => {
            if (activo && !confirm("¿Desactivar este usuario? No podrá ingresar.")) return;
            try {
              await cambiarEstadoUsuario(id, !activo);
            } catch (e) {
              setError((e as Error).message);
            }
          })
        }
      >
        {activo ? "Desactivar" : "Activar"}
      </button>
      {error && <p className="mt-1 text-sm text-teja-700">{error}</p>}
    </div>
  );
}

export function RestablecerPasswordForm({ id }: { id: string }) {
  const [estado, accion, pendiente] = useActionState(restablecerPassword, undefined);
  return (
    <form action={accion} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="min-w-48 flex-1">
        <label className="label">Nueva contraseña temporal</label>
        <input name="password" className="input" minLength={8} required />
      </div>
      <button className="btn-secundario" disabled={pendiente}>Asignar</button>
      {estado?.error && <p className="w-full text-teja-700">{estado.error}</p>}
      {estado?.ok && <p className="w-full text-marca-800">{estado.ok}</p>}
    </form>
  );
}
