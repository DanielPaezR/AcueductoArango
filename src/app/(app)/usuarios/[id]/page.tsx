import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";
import { EditarUsuarioForm, EstadoUsuarioBoton, RestablecerPasswordForm } from "./forms";

export const metadata = { title: "Usuario" };

export default async function UsuarioDetalle({ params }: PageProps<"/usuarios/[id]">) {
  const yo = await requerirPermiso("usuarios", "ver");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const u = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.id, id) });
  if (!u) notFound();

  const editable =
    puede(yo, "usuarios", "editar") && (u.rol !== "superadmin" || yo.rol === "superadmin");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/usuarios" className="font-semibold text-marca-700 hover:underline">← Usuarios</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.75rem] leading-tight font-bold">{u.nombre}</h1>
        {editable && u.id !== yo.id && <EstadoUsuarioBoton id={u.id} activo={u.activo} />}
      </div>
      <div className="tarjeta">
        <EditarUsuarioForm
          usuario={{
            id: u.id,
            nombre: u.nombre,
            username: u.username,
            telefono: u.telefono ?? "",
            cargo: u.cargo ?? "",
            rol: u.rol,
            permisos: u.permisos,
          }}
          editable={editable}
          esYoMismo={u.id === yo.id}
          puedeSuperadmin={yo.rol === "superadmin"}
        />
      </div>
      {editable && u.id !== yo.id && (
        <div className="tarjeta">
          <h2 className="mb-3 font-semibold">Restablecer contraseña</h2>
          <RestablecerPasswordForm id={u.id} />
        </div>
      )}
    </div>
  );
}
