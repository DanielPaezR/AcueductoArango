import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Ingresar" };

export default async function LoginPage() {
  if (await usuarioActual()) redirect("/");
  return (
    <main className="flex min-h-dvh flex-col bg-marca-800 sm:items-center sm:justify-center sm:p-6">
      <div className="px-6 pt-14 pb-10 text-marca-50 sm:w-full sm:max-w-md sm:px-1 sm:pt-0 sm:pb-6">
        <svg viewBox="0 0 32 32" className="mb-5 size-14" aria-hidden>
          <rect width="32" height="32" rx="7" fill="#f6f7f4" />
          <path d="M16 6 5 15h3v10h16V15h3z" fill="#1f5a3a" />
          <path d="M5 25h22v2.5H5z" fill="#1f6698" />
          <rect x="13.5" y="17" width="5" height="8" rx="1" fill="#f6f7f4" />
        </svg>
        <h1 className="text-[2rem] leading-tight font-bold text-white">JAC Arango</h1>
        <p className="mt-1 text-lg text-marca-100">Junta de Acción Comunal · Concepción, Antioquia</p>
      </div>

      <div className="flex-1 rounded-t-3xl bg-stone-50 px-6 pt-8 pb-12 sm:w-full sm:max-w-md sm:flex-none sm:rounded-2xl sm:p-8">
        <h2 className="mb-6 text-xl font-bold">Ingresar</h2>
        <LoginForm />
        <p className="mt-6 text-sm text-stone-600">
          ¿No tiene usuario o olvidó su contraseña? Pídale ayuda a la presidencia de la Junta.
        </p>
      </div>
    </main>
  );
}
