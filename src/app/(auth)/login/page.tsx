import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Ingresar" };

export default async function LoginPage() {
  if (await usuarioActual()) redirect("/");
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-marca-800 to-marca-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-marca-100 text-3xl">🏡</div>
          <h1 className="text-xl font-bold text-stone-900">Vereda</h1>
          <p className="text-sm text-stone-500">Junta de Acción Comunal y Acueducto</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
