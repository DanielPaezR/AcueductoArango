import { asc, isNull } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { puede, ROLES, type Rol } from "@/lib/permisos";
import { requerirMunicipio } from "@/lib/session";

export const metadata = { title: "Usuarios de la alcaldía" };

export default async function UsuariosAlcaldia() {
  const yo = await requerirMunicipio("municipio_veredas", "ver", "/municipio/usuarios");
  const lista = await db.select().from(schema.usuarios).where(isNull(schema.usuarios.veredaId)).orderBy(asc(schema.usuarios.nombre));
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.75rem] leading-tight font-bold">Usuarios de la alcaldía</h1>
        {puede(yo, "municipio_veredas", "crear") && <Link href="/municipio/usuarios/nuevo" className="btn-primario">Nuevo usuario</Link>}
      </div>
      <p className="text-stone-600">Los usuarios de cada vereda los crea su presidencia (o la alcaldía desde la ficha de la vereda).</p>
      <ul className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">
        {lista.map((u) => (
          <li key={u.id}>
            <Link href={`/municipio/usuarios/${u.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-stone-50 sm:px-5">
              <span>
                <span className="font-bold">{u.nombre}</span> <span className="text-stone-600">· {u.username}</span>
                <span className="block text-sm text-stone-600">{[ROLES[u.rol as Rol], u.cargo].filter(Boolean).join(" · ")}</span>
              </span>
              {!u.activo && <span className="chip bg-stone-200 text-stone-700">Inactivo</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
