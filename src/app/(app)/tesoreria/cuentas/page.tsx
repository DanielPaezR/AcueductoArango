import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { fechaCorta, hoyBogota, pesos } from "@/lib/dinero";
import { cuentasConSaldo } from "@/lib/finanzas";
import { requerirPermiso } from "@/lib/session";
import { CuentaForm } from "./cuenta-form";

export const metadata = { title: "Cuentas" };

export default async function Cuentas() {
  await requerirPermiso("tesoreria", "aprobar");
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
            <span className="text-lg font-bold">{c.nombre}</span>
            <span className="num text-lg font-bold">{pesos(c.saldo)}</span>
          </div>
          <p className="text-stone-600">
            Saldo inicial <span className="num">{pesos(c.saldoInicial)}</span> al <span className="num">{fechaCorta(c.fechaSaldoInicial)}</span>
          </p>
        </div>
      ))}
      <section className="tarjeta" aria-labelledby="nueva">
        <h2 id="nueva" className="mb-1 text-lg font-bold">Nueva cuenta</h2>
        <p className="mb-4 text-stone-600">
          Escriba el saldo que tiene la cuenta hoy según el extracto. Desde esa fecha, cada movimiento se registra en el sistema.
        </p>
        <CuentaForm hoy={hoyBogota()} />
      </section>
    </div>
  );
}
