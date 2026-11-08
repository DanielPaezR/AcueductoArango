"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { guardarOperacion } from "@/lib/offline/sync";
import { ESTADOS_RED, MATERIALES_TUBO, TIPOS_TRAMO } from "@/lib/red";
import type { TramoInput } from "@/lib/validacion";

export function TramoForm({ t }: { t: TramoInput }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>();
  const [guardando, setGuardando] = useState(false);

  const guardar = async (form: FormData) => {
    setGuardando(true);
    const num = (k: string) => (form.get(k) ? Number(String(form.get(k)).replace(",", ".")) : null);
    const r = await guardarOperacion({
      id: t.id,
      tipo: "tramo",
      etiqueta: `Tubería: ${String(form.get("nombre") || "sin nombre")}`,
      payload: {
        ...t,
        tipo: form.get("tipo"),
        estado: form.get("estado"),
        nombre: String(form.get("nombre") ?? "") || null,
        diametroPulg: num("diametroPulg"),
        material: String(form.get("material") ?? "") || null,
        anioInstalacion: num("anioInstalacion"),
        observaciones: String(form.get("observaciones") ?? "") || null,
      },
    });
    setGuardando(false);
    setMsg(r.error ? { error: r.error } : { ok: r.subido ? "Cambios guardados" : "Guardado en el teléfono; se subirá con señal" });
    router.refresh();
  };

  return (
    <form action={guardar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" className="input" defaultValue={t.tipo}>
            {Object.entries(TIPOS_TRAMO).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="nombre">Nombre</label>
          <input id="nombre" name="nombre" className="input" defaultValue={t.nombre ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="diametroPulg">Diámetro (pulgadas)</label>
          <input id="diametroPulg" name="diametroPulg" className="input num" inputMode="decimal" defaultValue={t.diametroPulg ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="material">Material</label>
          <select id="material" name="material" className="input" defaultValue={t.material ?? ""}>
            <option value="">—</option>
            {MATERIALES_TUBO.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="anioInstalacion">Año de instalación</label>
          <input id="anioInstalacion" name="anioInstalacion" className="input num" inputMode="numeric" defaultValue={t.anioInstalacion ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="estado">Estado</label>
          <select id="estado" name="estado" className="input" defaultValue={t.estado}>
            {Object.entries(ESTADOS_RED).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="observaciones">Observaciones</label>
        <textarea id="observaciones" name="observaciones" rows={2} className="input" defaultValue={t.observaciones ?? ""} />
      </div>
      {msg?.error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{msg.error}</p>}
      {msg?.ok && <p className="rounded-lg bg-marca-50 px-3 py-2.5 text-marca-800" role="status">{msg.ok}</p>}
      <button className="btn-secundario w-full" disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</button>
    </form>
  );
}
