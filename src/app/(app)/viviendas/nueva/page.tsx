import { ViviendaForm } from "@/components/vivienda-form";
import { listarSectores } from "@/lib/consultas";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Nueva vivienda" };

export default async function NuevaVivienda() {
  await requerirPermiso("censo", "crear");
  const sectores = await listarSectores();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Nueva vivienda</h1>
      <ViviendaForm sectores={sectores.map((s) => ({ id: s.id, nombre: s.nombre }))} />
    </div>
  );
}
