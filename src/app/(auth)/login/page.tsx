import { PLATAFORMA } from "@/lib/legal";
import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Ingresar" };

export default async function LoginPage() {
  if (await usuarioActual()) redirect("/");
  return (
    <main className="flex min-h-dvh flex-col bg-marca-800 sm:items-center sm:justify-center sm:p-6">
      <div className="px-6 pt-14 pb-10 text-marca-50 sm:w-full sm:max-w-md sm:px-1 sm:pt-0 sm:pb-6">
        <svg viewBox="0 0 512 512" className="mb-5 size-14 rounded-xl" aria-hidden>
          <rect width="512" height="512" fill="#f6f7f4" />
          <path d="M256 440C256 440 120 304 120 204A136 136 0 1 1 392 204C392 304 256 440 256 440Z" fill="#1f5a3a" />
          <path d="M176 210L256 140L336 210Z" fill="#f6f7f4" />
          <rect x="194" y="202" width="124" height="78" fill="#f6f7f4" />
          <rect x="194" y="268" width="124" height="12" fill="#1f6698" />
          <rect x="240" y="226" width="32" height="42" rx="5" fill="#1f5a3a" />
        </svg>
        <h1 className="text-[2rem] leading-tight font-bold text-white">{PLATAFORMA.nombre}</h1>
        <p className="mt-1 text-lg text-marca-100">Juntas de Acción Comunal y alcaldía · {PLATAFORMA.municipio}</p>
      </div>

      <div className="flex-1 rounded-t-3xl bg-stone-50 px-6 pt-8 pb-12 sm:w-full sm:max-w-md sm:flex-none sm:rounded-2xl sm:p-8">
        <h2 className="mb-6 text-xl font-bold">Ingresar</h2>
        <LoginForm />
        <p className="mt-6 text-sm text-stone-600">
          ¿No tiene usuario o olvidó su contraseña? Pídale ayuda a la presidencia de la Junta.
        </p>
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
          <a href="/transparencia" className="text-marca-700 underline">Cuentas claras</a>
          <a href="/privacidad" className="text-marca-700 underline">Datos personales</a>
          <a href="/terminos" className="text-marca-700 underline">Términos de uso</a>
        </p>
      </div>
    </main>
  );
}
