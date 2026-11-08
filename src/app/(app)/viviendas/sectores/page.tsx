import Link from "next/link";
import { listarSectores } from "@/lib/consultas";
import { requerirPermiso } from "@/lib/session";
import { SectorForm } from "./sector-form";

export const metadata = { title: "Sectores" };

export default async function Sectores() {
  await requerirPermiso("censo", "editar");
  const sectores = await listarSectores();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/viviendas" className="text-sm text-marca-700 hover:underline">← Viviendas</Link>
      <h1 className="text-2xl font-bold">Sectores de la vereda</h1>
      <p className="text-sm text-stone-500">Sirven para agrupar las viviendas en listas, mapas y reportes. El color se usa en el mapa.</p>
      <div className="tarjeta">
        <h2 className="mb-3 font-semibold">Nuevo sector</h2>
        <SectorForm />
      </div>
      {sectores.map((s) => (
        <div key={s.id} className="tarjeta">
          <SectorForm sector={s} />
        </div>
      ))}
    </div>
  );
}
