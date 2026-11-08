import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { puede, ROLES, type Rol } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Usuarios" };

export default async function Usuarios() {
  const yo = await requerirPermiso("usuarios", "ver");
  const lista = await db.select().from(schema.usuarios).orderBy(asc(schema.usuarios.nombre));
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Usuarios del sistema</h1>
        {puede(yo, "usuarios", "crear") && (
          <Link href="/usuarios/nuevo" className="btn-primario">+ Nuevo usuario</Link>
        )}
      </div>
      <div className="tarjeta overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-stone-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Último acceso</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.id} className="border-t border-stone-100 hover:bg-stone-50">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/usuarios/${u.id}`} className="text-marca-800 hover:underline">{u.nombre}</Link>
                </td>
                <td className="px-4 py-3">{u.username}</td>
                <td className="px-4 py-3">{ROLES[u.rol as Rol]}</td>
                <td className="px-4 py-3">
                  {u.activo ? (
                    <span className="rounded-full bg-marca-100 px-2 py-0.5 text-xs text-marca-800">Activo</span>
                  ) : (
                    <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-600">Inactivo</span>
                  )}
                </td>
                <td className="px-4 py-3 text-stone-500">
                  {u.ultimoAcceso ? u.ultimoAcceso.toLocaleString("es-CO", { timeZone: "America/Bogota" }) : "Nunca"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
