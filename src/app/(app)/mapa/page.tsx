import { Plus } from "lucide-react";
import Link from "next/link";
import { desc, isNull } from "drizzle-orm";
import { MapaUsuarios } from "@/components/mapa/dinamicos";
import { db, schema } from "@/db";
import { modulos } from "@/lib/config";
import { listarSectores, puntosMapa } from "@/lib/consultas";
import { puntosNovedades } from "@/lib/consultas-novedades";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Mapa de la vereda" };

export default async function Mapa() {
  const u = await requerirPermiso("mapa_usuarios", "ver");
  const [puntos, sectores, proyectos, novedades, m] = await Promise.all([
    puntosMapa(),
    listarSectores(),
    puede(u, "ayudas", "ver")
      ? db.select({ id: schema.proyectos.id, nombre: schema.proyectos.nombre }).from(schema.proyectos).where(isNull(schema.proyectos.deletedAt)).orderBy(desc(schema.proyectos.createdAt))
      : Promise.resolve([]),
    puede(u, "novedades", "ver") ? puntosNovedades() : Promise.resolve([]),
    modulos(),
  ]);
  return (
    <div className="-mx-4 -mt-5 -mb-28 flex h-[calc(100dvh-62px-64px)] flex-col sm:-mx-6 lg:-mx-10 lg:-mt-8 lg:-mb-12 lg:h-dvh">
      <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-2.5">
        <h1 className="text-xl font-bold">Mapa de la vereda</h1>
        {puede(u, "censo", "crear") && <Link href="/viviendas/nueva" className="btn-primario min-h-10 px-3.5 py-1.5">
            <Plus className="size-5" aria-hidden />
            Registrar
          </Link>}
      </div>
      <div className="min-h-0 flex-1">
        <MapaUsuarios puntos={puntos} proyectos={proyectos} novedades={novedades} conAcueducto={m.acueducto} sectores={sectores.map((s) => ({ id: s.id, nombre: s.nombre, color: s.color }))} />
      </div>
    </div>
  );
}
