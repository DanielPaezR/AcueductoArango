import { redirect } from "next/navigation";
import { cambiarModuloAcueducto } from "@/actions/configuracion";
import { modulos } from "@/lib/config";
import { requerirUsuario } from "@/lib/session";

export const metadata = { title: "Configuración" };

export default async function Configuracion() {
  const u = await requerirUsuario();
  if (u.rol !== "superadmin") redirect("/");
  const m = await modulos();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-[1.75rem] leading-tight font-bold">Configuración</h1>
      <section className="tarjeta space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Módulo del acueducto</h2>
          <span className={`chip ${m.acueducto ? "bg-marca-50 text-marca-800" : "bg-stone-200 text-stone-700"}`}>{m.acueducto ? "Encendido" : "Apagado"}</span>
        </div>
        <p className="text-stone-700">
          Red de tuberías, arreglos del fontanero, suscriptores, cobros mensuales y tesorería del acueducto. Al apagarlo se ocultan del menú, del
          inicio y de la página pública; <strong>los datos no se borran</strong> y vuelven a aparecer al encenderlo.
        </p>
        <form action={cambiarModuloAcueducto.bind(null, !m.acueducto)}>
          <button className={m.acueducto ? "btn-secundario" : "btn-primario"}>{m.acueducto ? "Apagar el módulo del acueducto" : "Encender el módulo del acueducto"}</button>
        </form>
      </section>
    </div>
  );
}
