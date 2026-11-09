"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { guardarItem } from "@/actions/libros";
import { FotosPicker, type FotoNueva } from "@/components/fotos-picker";
import { ESTADOS_BIEN } from "@/lib/opciones";
import { subirAdjuntos } from "@/lib/subir";

export type ItemInicial = {
  id: string;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  cantidad: number;
  estado: string;
  ubicacion: string | null;
  fechaAdquisicion: string | null;
  valor: string | null;
  procedencia: string | null;
  observaciones: string | null;
};

export function ItemForm({ inicial, hoy }: { inicial?: ItemInicial; hoy: string }) {
  const router = useRouter();
  const [fotos, setFotos] = useState<FotoNueva[]>([]);
  const [error, setError] = useState<string>();
  const [estado, setEstado] = useState<string>();

  const enviar = async (form: FormData) => {
    setError(undefined);
    setEstado("Guardando…");
    const r = await guardarItem(form);
    if (r.error || !r.id) {
      setEstado(undefined);
      return setError(r.error ?? "No se pudo guardar");
    }
    if (fotos.length) {
      setEstado("Subiendo fotos…");
      const e = await subirAdjuntos("inventario", r.id, fotos);
      if (e) {
        setEstado(undefined);
        return setError(`El bien quedó guardado, pero una foto no subió: ${e}.`);
      }
    }
    router.push(`/libros/inventario/${r.id}`);
    router.refresh();
  };

  const v = (k: keyof ItemInicial) => (inicial?.[k] as string | null) ?? "";
  return (
    <form action={enviar} className="tarjeta space-y-5">
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem_8rem]">
        <div>
          <label className="label" htmlFor="nombre">¿Qué es?</label>
          <input id="nombre" name="nombre" className="input" placeholder="Ej: Sillas plásticas, guadaña, sonido" defaultValue={v("nombre")} required />
        </div>
        <div>
          <label className="label" htmlFor="cantidad">Cantidad</label>
          <input id="cantidad" name="cantidad" className="input num" inputMode="numeric" defaultValue={inicial?.cantidad ?? 1} required />
        </div>
        <div>
          <label className="label" htmlFor="codigo">Código / placa</label>
          <input id="codigo" name="codigo" className="input num" defaultValue={v("codigo")} />
        </div>
      </div>
      <fieldset>
        <legend className="label">Estado</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(ESTADOS_BIEN).map(([k, e]) => (
            <label key={k} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 font-semibold has-checked:border-marca-700 has-checked:bg-marca-50 has-checked:ring-2 has-checked:ring-marca-600">
              <input type="radio" name="estado" value={k} defaultChecked={(inicial?.estado ?? "bueno") === k} className="size-4 accent-marca-700" />
              {e.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="descripcion">Descripción (marca, color, tamaño…)</label>
        <textarea id="descripcion" name="descripcion" rows={2} className="input" defaultValue={v("descripcion")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ubicacion">¿Dónde está o quién lo tiene?</label>
          <input id="ubicacion" name="ubicacion" className="input" placeholder="Ej: Caseta comunal" defaultValue={v("ubicacion")} />
        </div>
        <div>
          <label className="label" htmlFor="procedencia">Procedencia</label>
          <input id="procedencia" name="procedencia" className="input" placeholder="Compra, donación de…" defaultValue={v("procedencia")} />
        </div>
        <div>
          <label className="label" htmlFor="fechaAdquisicion">Fecha de adquisición</label>
          <input id="fechaAdquisicion" name="fechaAdquisicion" type="date" max={hoy} className="input" defaultValue={v("fechaAdquisicion")} />
        </div>
        <div>
          <label className="label" htmlFor="valor">Valor aproximado</label>
          <input id="valor" name="valor" className="input num" inputMode="numeric" placeholder="$ 0" defaultValue={inicial?.valor ? Number(inicial.valor) : ""} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="observaciones">Observaciones</label>
        <textarea id="observaciones" name="observaciones" rows={2} className="input" defaultValue={v("observaciones")} />
      </div>
      <div>
        <span className="label">Fotos {inicial ? "(se suman a las que ya tiene)" : "(opcional)"}</span>
        <FotosPicker fotos={fotos} onChange={setFotos} />
      </div>
      {error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{error}</p>}
      <button className="btn-primario min-h-14 w-full text-lg" disabled={Boolean(estado)}>
        {estado ?? (inicial ? "Guardar cambios" : "Agregar al inventario")}
      </button>
    </form>
  );
}
