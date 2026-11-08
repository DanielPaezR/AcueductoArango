import Link from "next/link";
import { MapaUsuarios } from "@/components/mapa/dinamicos";
import { listarSectores, puntosMapa } from "@/lib/consultas";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Mapa de usuarios" };

export default async function Mapa() {
  const u = await requerirPermiso("mapa_usuarios", "ver");
  const [puntos, sectores] = await Promise.all([puntosMapa(), listarSectores()]);
  return (
    <div className="-m-4 flex h-[calc(100dvh-57px)] flex-col lg:-m-8 lg:h-dvh">
      <div className="flex items-center justify-between border-b border-stone-200 bg-white px-3 py-2">
        <h1 className="font-bold">Mapa de usuarios</h1>
        {puede(u, "censo", "crear") && <Link href="/viviendas/nueva" className="btn-primario py-1.5">+ Vivienda</Link>}
      </div>
      <div className="min-h-0 flex-1">
        <MapaUsuarios puntos={puntos} sectores={sectores.map((s) => ({ id: s.id, nombre: s.nombre, color: s.color }))} />
      </div>
    </div>
  );
}
