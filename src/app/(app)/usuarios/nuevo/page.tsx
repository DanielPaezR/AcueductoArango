import { requerirPermiso } from "@/lib/session";
import { NuevoUsuarioForm } from "./nuevo-usuario-form";

export const metadata = { title: "Nuevo usuario" };

export default async function NuevoUsuario() {
  const yo = await requerirPermiso("usuarios", "crear");
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Nuevo usuario</h1>
      <div className="tarjeta">
        <NuevoUsuarioForm puedeSuperadmin={yo.rol === "superadmin"} />
      </div>
    </div>
  );
}
