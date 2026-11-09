"use client";

/** Sube archivos (fotos o PDF) como adjuntos de un registro. Devuelve el primer error, si hubo. */
export async function subirAdjuntos(entidad: string, entidadId: string, archivos: { id: string; blob: Blob; nombre?: string }[], tipo = "foto") {
  for (const a of archivos) {
    const fd = new FormData();
    fd.set("id", a.id);
    fd.set("entidad", entidad);
    fd.set("entidadId", entidadId);
    fd.set("tipo", tipo);
    fd.set("archivo", a.blob, a.nombre ?? `${a.id}.jpg`);
    const res = await fetch("/api/adjuntos", { method: "POST", body: fd }).catch(() => null);
    if (!res?.ok) {
      const b = res ? await res.json().catch(() => ({})) : {};
      return (b as { error?: string }).error ?? "sin conexión";
    }
  }
  return undefined;
}
