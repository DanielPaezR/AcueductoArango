import { ChevronLeft, Plus, Printer } from "lucide-react";
import Link from "next/link";
import { pesos } from "@/lib/dinero";
import { ESTADOS_BIEN } from "@/lib/opciones";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";
import { listarInventario } from "./lista";

export const metadata = { title: "Libro de inventario" };

export default async function Inventario() {
  const u = await requerirPermiso("libro_inventario", "ver");
  const items = await listarInventario();
  const activos = items.filter((i) => i.estado !== "dado_de_baja");
  const total = activos.reduce((s, i) => s + Number(i.valor ?? 0), 0);
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/libros" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Libros de la Junta
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.75rem] leading-tight font-bold">Libro de inventario</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/imprimir/inventario" className="btn-secundario">
            <Printer className="size-5" aria-hidden />
            Imprimir
          </Link>
          {puede(u, "libro_inventario", "crear") && (
            <Link href="/libros/inventario/nuevo" className="btn-primario">
              <Plus className="size-5" aria-hidden />
              Agregar bien
            </Link>
          )}
        </div>
      </div>
      <p className="text-stone-700">
        <span className="num font-bold">{activos.length}</span> bienes en uso
        {total > 0 && <> · valor aproximado <span className="num font-bold">{pesos(total)}</span></>}
      </p>
      <ul className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">
        {items.map((i) => {
          const e = ESTADOS_BIEN[i.estado as keyof typeof ESTADOS_BIEN];
          return (
            <li key={i.id}>
              <Link href={`/libros/inventario/${i.id}`} className={`flex items-center gap-3 px-4 py-3 hover:bg-stone-50 sm:px-5 ${i.estado === "dado_de_baja" ? "opacity-60" : ""}`}>
                <span className="num w-12 shrink-0 text-right text-lg font-bold">{i.cantidad}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{i.nombre}</span>
                  <span className="text-sm text-stone-600">
                    {[i.codigo, i.ubicacion, i.valor && pesos(Number(i.valor)), i.fotos ? `${i.fotos} foto(s)` : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {e && <span className={`chip shrink-0 ${e.clase}`}>{e.label}</span>}
              </Link>
            </li>
          );
        })}
        {!items.length && <li className="px-4 py-4 text-stone-600 sm:px-5">Todavía no hay bienes registrados.</li>}
      </ul>
    </div>
  );
}
