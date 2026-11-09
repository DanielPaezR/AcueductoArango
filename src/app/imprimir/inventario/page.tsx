import { listarInventario } from "@/app/(app)/libros/inventario/lista";
import { fechaCorta, pesos } from "@/lib/dinero";
import { datosResponsable } from "@/lib/legal";
import { ESTADOS_BIEN } from "@/lib/opciones";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Libro de inventario" };

export default async function ImprimirInventario() {
  await requerirPermiso("libro_inventario", "ver");
  const items = await listarInventario();
  const r = datosResponsable();
  const hoy = new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", dateStyle: "long" });
  const c = "border border-stone-500 px-2 py-1 text-left align-top";
  return (
    <article className="text-[0.9rem]">
      <header className="mb-3 text-center">
        <p className="font-bold uppercase">{r.nombre}</p>
        <p>NIT {r.nit} · {r.municipio}</p>
        <h1 className="mt-1 text-xl font-bold uppercase">Libro de inventario</h1>
        <p>Corte al {hoy}</p>
      </header>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-stone-100">
            {["Cant.", "Bien", "Código", "Estado", "Ubicación", "Adquirido", "Valor"].map((t) => (
              <th key={t} className={c}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="break-inside-avoid">
              <td className={`${c} num text-right`}>{i.cantidad}</td>
              <td className={c}>
                {i.nombre}
                {i.descripcion && <span className="block text-xs text-stone-600">{i.descripcion}</span>}
              </td>
              <td className={`${c} num`}>{i.codigo}</td>
              <td className={c}>{ESTADOS_BIEN[i.estado as keyof typeof ESTADOS_BIEN]?.label ?? i.estado}</td>
              <td className={c}>{i.ubicacion}</td>
              <td className={`${c} num whitespace-nowrap`}>{fechaCorta(i.fechaAdquisicion)}{i.procedencia && <span className="block text-xs">{i.procedencia}</span>}</td>
              <td className={`${c} num text-right whitespace-nowrap`}>{i.valor ? pesos(Number(i.valor)) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-16 grid grid-cols-3 gap-8 text-center break-inside-avoid">
        {["Presidencia", "Tesorería", "Fiscal"].map((t) => (
          <p key={t} className="border-t border-stone-800 pt-1">{t}</p>
        ))}
      </div>
    </article>
  );
}
