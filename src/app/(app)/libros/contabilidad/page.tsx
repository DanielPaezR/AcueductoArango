import { ChevronLeft, Plus, Printer } from "lucide-react";
import Link from "next/link";
import { datosResponsable } from "@/lib/legal";
import { hoyBogota, pesos } from "@/lib/dinero";
import { datosLibro } from "@/lib/libro";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";
import { AbrirLibroForm } from "./abrir-form";
import { LibroTabla } from "./libro-tabla";

export const metadata = { title: "Libro de contabilidad" };

export default async function LibroContable({ searchParams }: PageProps<"/libros/contabilidad">) {
  const u = await requerirPermiso("libro_contable", "ver");
  const sp = await searchParams;
  const actual = Number(hoyBogota().slice(0, 4));
  const anio = sp.anio === "todo" ? undefined : Number(sp.anio) || actual;
  const d = await datosLibro(anio);
  const puedeCrear = puede(u, "libro_contable", "crear");
  const puedeEditar = puede(u, "libro_contable", "editar");
  const anios = [...new Set([actual, ...d.anios])].sort((a, b) => b - a);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link href="/libros" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Libros
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-semibold text-stone-600">{datosResponsable().nombre}</p>
          <h1 className="text-[1.75rem] leading-tight font-bold">Libro de contabilidad</h1>
          {d.cuentas.length > 0 && (
            <p className="text-stone-700">
              {d.cuentas.map((c) => [c.nombre, c.entidad, c.ultimos_digitos && `termina en ${c.ultimos_digitos}`].filter(Boolean).join(" · ")).join(" | ")}
            </p>
          )}
        </div>
        {d.cuentas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/imprimir/libro-contable?anio=${anio ?? "todo"}`} className="btn-secundario">
              <Printer className="size-5" aria-hidden />
              Imprimir
            </Link>
            {puedeCrear && (
              <Link href="/libros/contabilidad/nuevo" className="btn-primario">
                <Plus className="size-5" aria-hidden />
                Nuevo asiento
              </Link>
            )}
          </div>
        )}
      </header>

      {!d.cuentas.length ? (
        puedeCrear ? (
          <section className="tarjeta" aria-labelledby="abrir">
            <h2 id="abrir" className="mb-1 text-lg font-bold">Abrir el libro</h2>
            <p className="mb-4 text-stone-700">
              Escriba la cuenta o caja donde está la plata de la Junta y el saldo que tiene hoy según el extracto o el último libro físico.
            </p>
            <AbrirLibroForm hoy={hoyBogota()} />
          </section>
        ) : (
          <div className="tarjeta text-stone-700">El libro todavía no se ha abierto. Lo abre la presidencia o la tesorería.</div>
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-stone-700">Año:</span>
            {[...anios.map(String), "todo"].map((a) => (
              <Link
                key={a}
                href={`/libros/contabilidad?anio=${a}`}
                aria-current={String(anio ?? "todo") === a ? "page" : undefined}
                className={`chip num min-h-10 px-4 ${String(anio ?? "todo") === a ? "bg-marca-700 text-white" : "bg-white text-stone-700 ring-1 ring-stone-300"}`}
              >
                {a === "todo" ? "Todo" : a}
              </Link>
            ))}
            <span className="ml-auto text-stone-700">
              Saldo actual: <strong className="num text-lg text-stone-900">{pesos(d.saldoFinal)}</strong>
            </span>
          </div>
          <LibroTabla
            asientos={d.asientos}
            saldoAnterior={d.saldoAnterior}
            ingresos={d.ingresos}
            egresos={d.egresos}
            saldoFinal={d.saldoFinal}
            puedeEditar={puedeEditar}
            etiquetaPeriodo={anio ? `(al 1 de enero de ${anio})` : "(saldo inicial)"}
          />
        </>
      )}
    </div>
  );
}
