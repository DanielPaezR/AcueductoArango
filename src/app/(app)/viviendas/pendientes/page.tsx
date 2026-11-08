import { Pendientes } from "./pendientes";

export const metadata = { title: "Pendientes por subir" };

export default function PendientesPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-[1.75rem] leading-tight font-bold">Pendientes por subir</h1>
      <p className="text-lg text-stone-600">
        Visitas guardadas en este teléfono que todavía no llegan al sistema. Se suben solas cuando hay señal.
      </p>
      <Pendientes />
    </div>
  );
}
