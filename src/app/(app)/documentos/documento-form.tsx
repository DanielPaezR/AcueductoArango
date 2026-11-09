"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { guardarDocumento } from "@/actions/libros";
import { FotosPicker, type FotoNueva } from "@/components/fotos-picker";
import { CATEGORIAS_DOCUMENTO } from "@/lib/opciones";
import { subirAdjuntos } from "@/lib/subir";

type Inicial = { id: string; titulo: string; categoria: string; descripcion: string | null; fechaDocumento: string | null };

export function DocumentoForm({ inicial, categoria }: { inicial?: Inicial; categoria?: string }) {
  const router = useRouter();
  const [archivos, setArchivos] = useState<FotoNueva[]>([]);
  const [error, setError] = useState<string>();
  const [estado, setEstado] = useState<string>();

  const enviar = async (form: FormData) => {
    setError(undefined);
    if (!inicial && !archivos.length) return setError("Agregue el PDF o las fotos de las páginas del documento.");
    setEstado("Guardando…");
    const r = await guardarDocumento(form);
    if (r.error || !r.id) {
      setEstado(undefined);
      return setError(r.error ?? "No se pudo guardar");
    }
    for (const [i, a] of archivos.entries()) {
      setEstado(`Subiendo archivo ${i + 1} de ${archivos.length}…`);
      const e = await subirAdjuntos("documento", r.id, [{ id: a.id, blob: a.blob, nombre: a.nombre }], "documento");
      if (e) {
        setEstado(undefined);
        return setError(`El documento quedó creado, pero un archivo no subió: ${e}. Ábralo y vuelva a intentarlo.`);
      }
    }
    router.push(`/documentos/${r.id}`);
    router.refresh();
  };

  return (
    <form action={enviar} className="tarjeta space-y-5">
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="titulo">Nombre del documento</label>
          <input id="titulo" name="titulo" className="input" placeholder="Ej: Estatutos de la JAC vereda Arango" defaultValue={inicial?.titulo} required />
        </div>
        <div>
          <label className="label" htmlFor="categoria">Tipo</label>
          <select id="categoria" name="categoria" className="input" defaultValue={inicial?.categoria ?? categoria ?? "estatutos"}>
            {Object.entries(CATEGORIAS_DOCUMENTO).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fechaDocumento">Fecha de aprobación (opcional)</label>
          <input id="fechaDocumento" name="fechaDocumento" type="date" className="input" defaultValue={inicial?.fechaDocumento ?? ""} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="descripcion">Nota (opcional)</label>
        <textarea id="descripcion" name="descripcion" rows={2} className="input" placeholder="Ej: Aprobados en asamblea del 12 de marzo, acta 045" defaultValue={inicial?.descripcion ?? ""} />
      </div>
      <div>
        <span className="label">Archivo PDF o fotos de cada página {inicial && "(se suman a los que ya tiene)"}</span>
        <p className="-mt-1 mb-2 text-sm text-stone-600">Máximo 10 MB por archivo. Las fotos se suben en el orden en que las agregue.</p>
        <FotosPicker fotos={archivos} onChange={setArchivos} etiqueta="Agregar" pdf ancho={2200} />
      </div>
      {error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{error}</p>}
      <button className="btn-primario min-h-14 w-full text-lg" disabled={Boolean(estado)}>
        {estado ?? (inicial ? "Guardar cambios" : "Guardar documento")}
      </button>
    </form>
  );
}
