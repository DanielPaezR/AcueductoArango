"use client";

import { ArrowDownLeft, ArrowUpRight, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { guardarAsiento } from "@/actions/libro";
import { CATEGORIAS_POR_FONDO } from "@/lib/dinero";
import { comprimirImagen } from "@/lib/offline/sync";

type Inicial = { id: string; cuentaId: number; tipo: "ingreso" | "egreso"; categoria: string; concepto: string; fecha: string; valor: number; comprobante: string | null };

export function AsientoForm({ cuentas, hoy, inicial }: { cuentas: { id: number; nombre: string }[]; hoy: string; inicial?: Inicial }) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"ingreso" | "egreso">(inicial?.tipo ?? "egreso");
  const [fotos, setFotos] = useState<{ id: string; blob: Blob; url: string }[]>([]);
  const [error, setError] = useState<string>();
  const [estado, setEstado] = useState<string>();

  const enviar = async (form: FormData) => {
    setError(undefined);
    setEstado("Guardando…");
    const r = await guardarAsiento(form);
    if (r.error || !r.id) {
      setEstado(undefined);
      return setError(r.error ?? "No se pudo guardar");
    }
    for (const [i, f] of fotos.entries()) {
      setEstado(`Subiendo comprobante ${i + 1} de ${fotos.length}…`);
      const fd = new FormData();
      fd.set("id", f.id);
      fd.set("entidad", "movimiento");
      fd.set("entidadId", r.id);
      fd.set("tipo", "soporte");
      fd.set("archivo", f.blob, `${f.id}.jpg`);
      const res = await fetch("/api/adjuntos", { method: "POST", body: fd }).catch(() => null);
      if (!res?.ok) {
        const b = res ? await res.json().catch(() => ({})) : {};
        setEstado(undefined);
        return setError(`El asiento quedó guardado, pero un comprobante no subió: ${b.error ?? "sin conexión"}. Vuelva a intentarlo desde Corregir asiento.`);
      }
    }
    router.push("/libros/contabilidad");
    router.refresh();
  };

  return (
    <form action={enviar} className="tarjeta space-y-5">
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <fieldset>
        <legend className="label">¿Entra o sale dinero?</legend>
        <input type="hidden" name="tipo" value={tipo} />
        <div className="grid grid-cols-2 gap-2">
          {([
            ["ingreso", "Ingreso", ArrowDownLeft],
            ["egreso", "Egreso", ArrowUpRight],
          ] as const).map(([v, l, Icono]) => (
            <button
              type="button"
              key={v}
              aria-pressed={tipo === v}
              onClick={() => setTipo(v)}
              className={`btn border ${tipo === v ? "border-marca-700 bg-marca-700 text-white" : "border-stone-300 bg-white text-stone-800"}`}
            >
              <Icono className="size-5" aria-hidden />
              {l}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fecha">Fecha</label>
          <input id="fecha" name="fecha" type="date" className="input" defaultValue={inicial?.fecha ?? hoy} max={hoy} required />
        </div>
        <div>
          <label className="label" htmlFor="valor">Valor</label>
          <input id="valor" name="valor" className="input num text-lg" inputMode="numeric" placeholder="$ 0" defaultValue={inicial?.valor} required />
        </div>
        <div>
          <label className="label" htmlFor="categoria">Categoría</label>
          <select id="categoria" name="categoria" className="input" key={tipo} defaultValue={inicial?.tipo === tipo ? inicial.categoria : ""} required>
            <option value="" disabled>
              Elija…
            </option>
            {CATEGORIAS_POR_FONDO.junta[tipo].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="comprobante">N.º de comprobante (opcional)</label>
          <input id="comprobante" name="comprobante" className="input num" placeholder="Recibo, factura…" defaultValue={inicial?.comprobante ?? ""} />
        </div>
        {cuentas.length > 1 ? (
          <div>
            <label className="label" htmlFor="cuentaId">Cuenta o caja</label>
            <select id="cuentaId" name="cuentaId" className="input" defaultValue={inicial?.cuentaId ?? cuentas[0].id}>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="cuentaId" value={inicial?.cuentaId ?? cuentas[0].id} />
        )}
      </div>
      <div>
        <label className="label" htmlFor="concepto">Concepto</label>
        <textarea id="concepto" name="concepto" rows={2} className="input" defaultValue={inicial?.concepto} placeholder="Ej: Cuota de afiliación de octubre" required />
      </div>
      <div>
        <span className="label">Fotos del comprobante {inicial ? "(se suman a las que ya tiene)" : ""}</span>
        <div className="flex flex-wrap gap-2">
          {fotos.map((f) => (
            <div key={f.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt="" className="size-24 rounded-lg object-cover" />
              <button
                type="button"
                className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-teja-600 text-white shadow"
                aria-label="Quitar foto"
                onClick={() => setFotos((xs) => xs.filter((x) => x.id !== f.id))}
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          ))}
          <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-stone-300 text-sm font-semibold text-stone-600 hover:border-marca-600 hover:text-marca-700">
            <Plus className="size-6" aria-hidden />
            Foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={async (e) => {
                const nuevas = await Promise.all(
                  Array.from(e.target.files ?? []).map(async (f) => {
                    const blob = await comprimirImagen(f, 2000, 0.85);
                    return { id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) };
                  }),
                );
                setFotos((xs) => [...xs, ...nuevas]);
              }}
            />
          </label>
        </div>
      </div>
      {inicial && (
        <p className="rounded-lg bg-ocre-50 px-3 py-2.5 text-ocre-800 ring-1 ring-ocre-100">
          La corrección queda en el historial del asiento con su nombre, la fecha y el valor anterior.
        </p>
      )}
      {error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{error}</p>}
      <button className="btn-primario min-h-14 w-full text-lg" disabled={Boolean(estado)}>
        {estado ?? (inicial ? "Guardar corrección" : "Registrar en el libro")}
      </button>
    </form>
  );
}
