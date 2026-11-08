import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hoyBogota } from "@/lib/dinero";
import { cuentasConSaldo } from "@/lib/finanzas";
import { requerirAlgunFondo } from "@/lib/session";
import { MovimientoForm } from "./movimiento-form";

export const metadata = { title: "Registrar movimiento" };

export default async function NuevoMovimiento({ searchParams }: PageProps<"/tesoreria/nuevo">) {
  const { fondos } = await requerirAlgunFondo("crear");
  const { fondo } = await searchParams;
  // Solo las cuentas de los fondos donde este usuario puede registrar
  const cuentas = (await cuentasConSaldo(true))
    .filter((c) => fondos.includes(c.fondo as "acueducto" | "junta"))
    .map((c) => ({ id: c.id, nombre: c.nombre, fondo: c.fondo as "acueducto" | "junta" }));
  if (!cuentas.length) redirect("/tesoreria");
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/tesoreria" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Tesorería
      </Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">Registrar ingreso o gasto</h1>
      <p className="rounded-lg bg-ocre-50 px-4 py-3 text-ocre-800 ring-1 ring-ocre-100">
        Todo lo que escriba aquí y las fotos del soporte serán <strong>públicos</strong> una vez la presidencia lo apruebe.
        No escriba nombres de usuarios ni datos personales.
      </p>
      <MovimientoForm cuentas={cuentas} hoy={hoyBogota()} fondoInicial={fondo === "junta" ? "junta" : "acueducto"} />
    </div>
  );
}
