import { Pendientes } from "./pendientes";

export const metadata = { title: "Pendientes por subir" };

export default function PendientesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Pendientes por subir</h1>
      <p className="text-sm text-stone-500">
        Registros guardados en este teléfono que aún no llegan al servidor. Se suben solos cuando hay señal.
      </p>
      <Pendientes />
    </div>
  );
}
