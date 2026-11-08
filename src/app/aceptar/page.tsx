import { redirect } from "next/navigation";
import { CompromisoUsuarios } from "@/components/texto-terminos";
import { VERSION_POLITICA, VERSION_TERMINOS } from "@/lib/legal";
import { requerirUsuario } from "@/lib/session";
import { AceptarForm } from "./aceptar-form";

export const metadata = { title: "Términos de uso" };

export default async function Aceptar() {
  const u = await requerirUsuario();
  if (u.terminosVersion === VERSION_TERMINOS) redirect("/");
  return (
    <main className="min-h-dvh bg-stone-50">
      <header className="bg-marca-800 px-4 py-6 text-white sm:px-6">
        <div className="mx-auto max-w-2xl">
          <p className="font-semibold text-marca-100">JAC Arango</p>
          <h1 className="mt-1 text-[1.75rem] leading-tight font-bold">Antes de continuar, {u.nombre.split(" ")[0]}</h1>
          <p className="mt-1 text-marca-100">
            En este sistema hay datos personales de las familias de la vereda. Lea y acepte su compromiso como usuario.
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6">
        <article className="legal tarjeta space-y-3 text-[1.02rem] leading-relaxed">
          <CompromisoUsuarios />
          <p>
            Lea también la{" "}
            <a href="/privacidad" target="_blank" className="font-semibold text-marca-700 underline">Política de tratamiento de datos personales</a>{" "}
            (versión {VERSION_POLITICA}) y los{" "}
            <a href="/terminos" target="_blank" className="font-semibold text-marca-700 underline">Términos de uso</a> (versión {VERSION_TERMINOS}).
          </p>
        </article>
        <AceptarForm />
      </div>
    </main>
  );
}
