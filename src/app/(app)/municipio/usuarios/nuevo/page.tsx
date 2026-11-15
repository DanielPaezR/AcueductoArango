import Link from "next/link";
import { NuevoUsuarioForm } from "@/app/(app)/usuarios/nuevo/nuevo-usuario-form";
import { requerirMunicipio } from "@/lib/session";

export const metadata = { title: "Nuevo usuario de la alcaldía" };

export default async function NuevoUsuarioAlcaldia() {
  const yo = await requerirMunicipio("municipio_veredas", "crear", "/municipio/usuarios/nuevo");
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href="/municipio/usuarios" className="font-semibold text-marca-700 hover:underline">← Usuarios de la alcaldía</Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">Nuevo usuario de la alcaldía</h1>
      <div className="tarjeta">
        <NuevoUsuarioForm modo="municipio" puedeSuperadmin={yo.rol === "superadmin"} />
      </div>
    </div>
  );
}
