"use client";

import { dbLocal } from "./db";

export type ResultadoSync = { subidas: number; fallidas: number; ultimoError?: string; sesionVencida?: boolean };

let enCurso: Promise<ResultadoSync> | null = null;

/** Sube todo lo pendiente. Solo una sincronización a la vez. */
export function sincronizar(): Promise<ResultadoSync> {
  enCurso ??= ejecutar().finally(() => {
    enCurso = null;
  });
  return enCurso;
}

async function ejecutar(): Promise<ResultadoSync> {
  const r: ResultadoSync = { subidas: 0, fallidas: 0 };

  for (const p of await dbLocal.viviendas.orderBy("guardadoEn").toArray()) {
    try {
      const res = await fetch("/api/sync/vivienda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p.payload),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) return { ...r, sesionVencida: true, ultimoError: body.error };
      if (!res.ok || !body.ok) throw new Error(body.error ?? `Error ${res.status}`);
      await dbLocal.viviendas.delete(p.id);
      r.subidas++;
    } catch (e) {
      r.fallidas++;
      r.ultimoError = (e as Error).message;
      await dbLocal.viviendas.update(p.id, { intentos: p.intentos + 1, error: r.ultimoError });
      if (e instanceof TypeError) return r; // sin red: no seguir intentando
    }
  }

  // Red del acueducto y mantenimientos: primero puntos y tuberías, luego arreglos que los referencian
  const orden = { elemento: 0, tramo: 1, mantenimiento: 2 } as const;
  const ops = (await dbLocal.operaciones.toArray()).sort(
    (a, b) => orden[a.tipo] - orden[b.tipo] || a.guardadoEn - b.guardadoEn,
  );
  for (const op of ops) {
    try {
      const res = await fetch(`/api/sync/${op.tipo}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(op.payload),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) return { ...r, sesionVencida: true, ultimoError: body.error };
      if (!res.ok || !body.ok) throw new Error(body.error ?? `Error ${res.status}`);
      await dbLocal.operaciones.delete(op.id);
      r.subidas++;
    } catch (e) {
      r.fallidas++;
      r.ultimoError = (e as Error).message;
      await dbLocal.operaciones.update(op.id, { intentos: op.intentos + 1, error: r.ultimoError });
      if (e instanceof TypeError) return r;
    }
  }

  const pendientesViv = new Set([
    ...(await dbLocal.viviendas.toCollection().primaryKeys()),
    ...(await dbLocal.operaciones.toCollection().primaryKeys()),
  ]);
  for (const f of await dbLocal.fotos.orderBy("guardadoEn").toArray()) {
    if (pendientesViv.has(f.entidadId)) continue; // primero debe subir la vivienda
    try {
      const fd = new FormData();
      fd.set("id", f.id);
      fd.set("entidad", f.entidad);
      fd.set("entidadId", f.entidadId);
      fd.set("tipo", f.tipo);
      fd.set("archivo", f.blob, `${f.id}.jpg`);
      const res = await fetch("/api/adjuntos", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) return { ...r, sesionVencida: true, ultimoError: body.error };
      if (!res.ok || !body.ok) throw new Error(body.error ?? `Error ${res.status}`);
      await dbLocal.fotos.delete(f.id);
      r.subidas++;
    } catch (e) {
      r.fallidas++;
      r.ultimoError = (e as Error).message;
      await dbLocal.fotos.update(f.id, { intentos: f.intentos + 1, error: r.ultimoError });
      if (e instanceof TypeError) return r;
    }
  }
  return r;
}

/** Reduce una foto del celular (5–10 MB) a ~1600px JPEG (~300 KB) antes de guardarla. */
export async function comprimirImagen(archivo: File, maxLado = 1600, calidad = 0.8): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(archivo);
    const escala = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    return await new Promise((ok, mal) =>
      canvas.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo comprimir"))), "image/jpeg", calidad),
    );
  } catch {
    return archivo;
  }
}

/** Guarda un registro de campo en el teléfono (con sus fotos) e intenta subirlo. Devuelve true si ya quedó en el servidor. */
export async function guardarOperacion(
  op: { id: string; tipo: import("./db").TipoOperacion; payload: unknown; etiqueta: string },
  fotos: { id: string; blob: Blob; tipo?: string }[] = [],
): Promise<{ subido: boolean; error?: string }> {
  await dbLocal.transaction("rw", dbLocal.operaciones, dbLocal.fotos, async () => {
    await dbLocal.operaciones.put({ ...op, guardadoEn: Date.now(), intentos: 0 });
    for (const f of fotos)
      await dbLocal.fotos.put({
        id: f.id,
        entidad: op.tipo,
        entidadId: op.id,
        tipo: f.tipo ?? "foto",
        blob: f.blob,
        guardadoEn: Date.now(),
        intentos: 0,
      });
  });
  if (!navigator.onLine) return { subido: false };
  await sincronizar();
  const sigue = await dbLocal.operaciones.get(op.id);
  if (!sigue) return { subido: true };
  return { subido: false, error: sigue.error && !/fetch|network/i.test(sigue.error) ? sigue.error : undefined };
}
