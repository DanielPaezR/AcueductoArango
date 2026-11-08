import Link from "next/link";

export default function SinAcceso() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="text-5xl">🔒</div>
      <h1 className="mt-4 text-xl font-bold">No tienes acceso a esta sección</h1>
      <p className="mt-2 text-stone-500">Si crees que deberías tenerlo, habla con el administrador.</p>
      <Link href="/" className="btn-secundario mt-6">Volver al inicio</Link>
    </div>
  );
}
