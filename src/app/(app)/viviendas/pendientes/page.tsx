import { Pendientes } from "./pendientes";

export const metadata = { title: "Pendientes por subir" };

export default function PendientesPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-[1.75rem] leading-tight font-bold">Pendientes por subir</h1>
      <p className="text-lg text-stone-600">
        Lo guardado en este teléfono que todavía no llega al sistema: casas, registros del acueducto, fotos y firmas. Se sube solo
        cuando hay señal; las fotos pueden tardar más que los datos.
      </p>
      <Pendientes />
    </div>
  );
}
