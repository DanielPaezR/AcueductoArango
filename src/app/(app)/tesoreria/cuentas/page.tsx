import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { fechaCorta, FONDOS, hoyBogota, pesos, type Fondo } from "@/lib/dinero";
import { cuentasConSaldo } from "@/lib/finanzas";
import { requerirPermiso } from "@/lib/session";
import { CuentaForm, EditarCuentaForm } from "./cuenta-form";

export const metadata = { title: "Cuentas" };

export default async function Cuentas({ searchParams }: PageProps<"/tesoreria/cuentas">) {
  await requerirPermiso("tesoreria", "aprobar");
  const { fondo } = await searchParams;
  const cuentas = await cuentasConSaldo();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/tesoreria" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Tesorería
      </Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">Cuentas del acueducto</h1>
      {cuentas.map((c) => (
        <div key={c.id} className="tarjeta">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-lg font-bold">
              {c.nombre} <span className="chip ml-1 bg-stone-200 align-middle text-stone-800">{FONDOS[c.fondo as Fondo]}</span>
            </span>
            <span className="num text-lg font-bold">{pesos(c.saldo)}</span>
          </div>
          <p className="text-stone-600">
            Saldo inicial <span className="num">{pesos(c.saldoInicial)}</span> al <span className="num">{fechaCorta(c.fechaSaldoInicial)}</span>
            {!c.activa && <span className="font-semibold text-ocre-800"> · Inactiva</span>}
          </p>
          <details className="mt-3">
            <summary className="cursor-pointer font-semibold text-marca-700">Corregir datos</summary>
            <EditarCuentaForm c={{ id: c.id, nombre: c.nombre, entidad: c.entidad, ultimosDigitos: c.ultimosDigitos, activa: c.activa, saldoInicial: c.saldoInicial }} />
          </details>
        </div>
      ))}
      <section className="tarjeta" aria-labelledby="nueva">
        <h2 id="nueva" className="mb-1 text-lg font-bold">Nueva cuenta</h2>
        <p className="mb-4 text-stone-600">
          Escriba el saldo que tiene la cuenta hoy según el extracto. Desde esa fecha, cada movimiento se registra en el sistema.
        </p>
        <CuentaForm hoy={hoyBogota()} fondo={fondo === "junta" ? "junta" : "acueducto"} />
      </section>
    </div>
  );
}
