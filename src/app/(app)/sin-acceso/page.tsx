import { Lock } from "lucide-react";
import Link from "next/link";

export default function SinAcceso() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Lock className="mx-auto size-12 text-stone-500" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold">No tiene acceso a esta sección</h1>
      <p className="mt-2 text-lg text-stone-600">Si necesita entrar aquí, pídale el permiso a la presidencia de la Junta.</p>
      <Link href="/" className="btn-secundario mt-6">Volver al inicio</Link>
    </div>
  );
}
