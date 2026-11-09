"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { guardarActa } from "@/actions/libros";
import { FotosPicker, type FotoNueva } from "@/components/fotos-picker";
import { TIPOS_ACTA } from "@/lib/opciones";
import { subirAdjuntos } from "@/lib/subir";

export type ActaInicial = {
  id: string;
  numero: string;
  tipo: string;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  lugar: string | null;
  asistentes: number | null;
  quorum: boolean | null;
  ordenDelDia: string | null;
  desarrollo: string | null;
  decisiones: string | null;
  presidente: string | null;
  secretario: string | null;
};

export function ActaForm({ inicial, sugerido, hoy }: { inicial?: ActaInicial; sugerido?: string; hoy: string }) {
  const router = useRouter();
  const [fotos, setFotos] = useState<FotoNueva[]>([]);
  const [error, setError] = useState<string>();
  const [estado, setEstado] = useState<string>();

  const enviar = async (form: FormData) => {
    setError(undefined);
    setEstado("Guardando…");
    const r = await guardarActa(form);
    if (r.error || !r.id) {
      setEstado(undefined);
      return setError(r.error ?? "No se pudo guardar");
    }
    if (fotos.length) {
      setEstado("Subiendo el acta escaneada…");
      const e = await subirAdjuntos("acta", r.id, fotos.map((f) => ({ id: f.id, blob: f.blob, nombre: f.nombre })), "documento");
      if (e) {
        setEstado(undefined);
        return setError(`El acta quedó guardada, pero un archivo no subió: ${e}. Vuelva a intentarlo desde Corregir.`);
      }
    }
    router.push(`/libros/actas/${r.id}`);
    router.refresh();
  };

  const area = (name: keyof ActaInicial, label: string, rows: number, ayuda?: string) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      {ayuda && <p className="-mt-1 mb-1.5 text-sm text-stone-600">{ayuda}</p>}
      <textarea id={name} name={name} rows={rows} className="input" defaultValue={(inicial?.[name] as string) ?? ""} />
    </div>
  );

  return (
    <form action={enviar} className="tarjeta space-y-5">
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="numero">Acta N.º</label>
          <input id="numero" name="numero" className="input num" defaultValue={inicial?.numero ?? sugerido} required />
        </div>
        <div>
          <label className="label" htmlFor="tipo">Tipo de reunión</label>
          <select id="tipo" name="tipo" className="input" defaultValue={inicial?.tipo ?? "asamblea"}>
            {Object.entries(TIPOS_ACTA).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fecha">Fecha</label>
          <input id="fecha" name="fecha" type="date" className="input" defaultValue={inicial?.fecha ?? hoy} required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="horaInicio">Hora inicio</label>
            <input id="horaInicio" name="horaInicio" type="time" className="input" defaultValue={inicial?.horaInicio ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="horaFin">Hora fin</label>
            <input id="horaFin" name="horaFin" type="time" className="input" defaultValue={inicial?.horaFin ?? ""} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="lugar">Lugar</label>
          <input id="lugar" name="lugar" className="input" placeholder="Ej: Escuela de la vereda" defaultValue={inicial?.lugar ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="asistentes">Asistentes</label>
            <input id="asistentes" name="asistentes" className="input num" inputMode="numeric" defaultValue={inicial?.asistentes ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="quorum">¿Hubo quórum?</label>
            <select id="quorum" name="quorum" className="input" defaultValue={inicial?.quorum === true ? "si" : inicial?.quorum === false ? "no" : ""}>
              <option value="">—</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </div>
      {area("ordenDelDia", "Orden del día", 4, "Un punto por renglón")}
      {area("desarrollo", "Desarrollo de la reunión", 8)}
      {area("decisiones", "Decisiones y compromisos", 4, "Qué se aprobó, quién se encarga y para cuándo")}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="presidente">Presidente(a) de la reunión</label>
          <input id="presidente" name="presidente" className="input" defaultValue={inicial?.presidente ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="secretario">Secretario(a)</label>
          <input id="secretario" name="secretario" className="input" defaultValue={inicial?.secretario ?? ""} />
        </div>
      </div>
      <div>
        <span className="label">Acta firmada y lista de asistencia (fotos o PDF)</span>
        <FotosPicker fotos={fotos} onChange={setFotos} etiqueta="Agregar" pdf />
      </div>
      {error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{error}</p>}
      <button className="btn-primario min-h-14 w-full text-lg" disabled={Boolean(estado)}>
        {estado ?? (inicial ? "Guardar cambios" : "Guardar acta")}
      </button>
    </form>
  );
}
