"use client";

import { ArrowDownLeft, ArrowUpRight, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { registrarMovimiento } from "@/actions/tesoreria";
import { CATEGORIAS } from "@/lib/dinero";
import { comprimirImagen } from "@/lib/offline/sync";

type Foto = { id: string; blob: Blob; url: string };

export function MovimientoForm({ cuentas, hoy }: { cuentas: { id: number; nombre: string }[]; hoy: string }) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"ingreso" | "egreso">("egreso");
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [error, setError] = useState<string>();
  const [estado, setEstado] = useState<string>();

  const agregar = async (files: FileList | null) => {
    if (!files) return;
    const nuevas = await Promise.all(
      Array.from(files).map(async (f) => {
        const blob = await comprimirImagen(f, 2000, 0.85);
        return { id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) };
      }),
    );
    setFotos((x) => [...x, ...nuevas]);
  };

  const enviar = async (form: FormData) => {
    setError(undefined);
    if (tipo === "egreso" && !fotos.length && !confirm("¿Registrar el gasto sin foto de la factura o recibo?")) return;
    setEstado("Guardando…");
    const r = await registrarMovimiento(form);
    if (r.error || !r.id) {
      setEstado(undefined);
      return setError(r.error ?? "No se pudo guardar");
    }
    for (const [i, f] of fotos.entries()) {
      setEstado(`Subiendo soporte ${i + 1} de ${fotos.length}…`);
      const fd = new FormData();
      fd.set("id", f.id);
      fd.set("entidad", "movimiento");
      fd.set("entidadId", r.id);
      fd.set("tipo", "soporte");
      fd.set("archivo", f.blob, `${f.id}.jpg`);
      const res = await fetch("/api/adjuntos", { method: "POST", body: fd });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(`El movimiento quedó guardado, pero un soporte no subió: ${b.error ?? res.status}`);
      }
    }
    router.push("/tesoreria");
    router.refresh();
  };

  return (
    <form action={enviar} className="tarjeta space-y-5">
      <fieldset>
        <legend className="label">¿Entra o sale dinero?</legend>
        <input type="hidden" name="tipo" value={tipo} />
        <div className="grid grid-cols-2 gap-2">
          {([
            ["egreso", "Gasto (sale)", ArrowUpRight],
            ["ingreso", "Ingreso (entra)", ArrowDownLeft],
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
          <label className="label" htmlFor="valor">Valor</label>
          <input id="valor" name="valor" className="input num text-lg" inputMode="numeric" placeholder="$ 0" required />
        </div>
        <div>
          <label className="label" htmlFor="fecha">Fecha</label>
          <input id="fecha" name="fecha" type="date" className="input" defaultValue={hoy} max={hoy} required />
        </div>
        <div>
          <label className="label" htmlFor="categoria">Categoría</label>
          <select id="categoria" name="categoria" className="input" key={tipo} required defaultValue="">
            <option value="" disabled>
              Elija…
            </option>
            {CATEGORIAS[tipo].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cuentaId">Cuenta</label>
          <select id="cuentaId" name="cuentaId" className="input" defaultValue={cuentas[0]?.id}>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="concepto">Concepto</label>
        <textarea
          id="concepto"
          name="concepto"
          rows={2}
          className="input"
          placeholder={tipo === "egreso" ? "Ej: 3 tubos PVC 1/2'' para reparación en el sector La Loma" : "Ej: Aporte de la Alcaldía para mantenimiento"}
          required
        />
      </div>

      <div>
        <span className="label">Fotos del soporte (factura, recibo, consignación)</span>
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
            <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => agregar(e.target.files)} />
          </label>
        </div>
      </div>

      {error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{error}</p>}
      <button className="btn-primario w-full min-h-14 text-lg" disabled={Boolean(estado)}>
        {estado ?? "Enviar para aprobación"}
      </button>
      <p className="text-center text-sm text-stone-600">La presidencia lo revisa y aprueba antes de que cuente en el saldo.</p>
    </form>
  );
}
