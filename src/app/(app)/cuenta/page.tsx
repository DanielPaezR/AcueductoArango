import { ROLES, type Rol } from "@/lib/permisos";
import { requerirUsuario } from "@/lib/session";
import { CambiarPasswordForm } from "./cambiar-password-form";

export const metadata = { title: "Mi cuenta" };

export default async function Cuenta({ searchParams }: PageProps<"/cuenta">) {
  const u = await requerirUsuario();
  const { primera } = await searchParams;
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Mi cuenta</h1>
      <div className="tarjeta text-sm">
        <div><span className="text-stone-500">Nombre:</span> {u.nombre}</div>
        <div><span className="text-stone-500">Usuario:</span> {u.username}</div>
        <div><span className="text-stone-500">Rol:</span> {ROLES[u.rol as Rol]}</div>
      </div>
      {(primera || u.debeCambiarPassword) && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Por seguridad, cambia la contraseña temporal antes de continuar.
        </p>
      )}
      <div className="tarjeta">
        <h2 className="mb-4 font-semibold">Cambiar contraseña</h2>
        <CambiarPasswordForm />
      </div>
    </div>
  );
}
