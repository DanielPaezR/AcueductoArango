"use client";

import { dbLocal } from "./db";

export type ResultadoSync = { subidas: number; fallidas: number; ultimoError?: string; sesionVencida?: boolean };

/** fetch con tiempo límite: con señal débil una petición nunca se queda colgada. */
function conTiempo(url: string, init: RequestInit, ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

/** Error de red o de tiempo (no del servidor): se deja de intentar hasta la próxima vez. */
const esDeRed = (e: unknown) => e instanceof TypeError || (e instanceof DOMException && e.name === "AbortError");

const TIEMPO_DATOS = 20_000;
/** Al guardar no se hace esperar a nadie: los datos ya quedaron en el teléfono. */
const TIEMPO_GUARDAR = 8_000;
const TIEMPO_FOTO = 90_000;

/* ---------- Aviso de sesión vencida (los pendientes no pueden subir hasta volver a entrar) ---------- */

const CLAVE_SESION = "vereda_sesion_vencida";
const oyentesSesion = new Set<() => void>();
function marcarSesion(vencida: boolean) {
  try {
    if (vencida) localStorage.setItem(CLAVE_SESION, "1");
    else localStorage.removeItem(CLAVE_SESION);
  } catch {}
  oyentesSesion.forEach((f) => f());
}
export const sesion = {
  suscribir(f: () => void) {
    oyentesSesion.add(f);
    return () => void oyentesSesion.delete(f);
  },
  vencida() {
    try {
      return localStorage.getItem(CLAVE_SESION) === "1";
    } catch {
      return false;
    }
  },
};

/**
 * Pide al navegador que suba los pendientes en segundo plano apenas haya señal,
 * aunque la app esté cerrada (Background Sync; Chrome en Android). En otros navegadores
 * sube igual al abrir la app, cada minuto y cuando vuelve la señal.
 */
export async function pedirSubidaEnFondo() {
  try {
    const reg = await navigator.serviceWorker?.ready;
    await (reg as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } })?.sync?.register("subir-pendientes");
  } catch {}
}

/** Un solo proceso a la vez sube cada carril, sea la página o el service worker. */
function conCandado<T>(nombre: string, f: () => Promise<T>): Promise<T> {
  return navigator.locks ? (navigator.locks.request(nombre, f) as Promise<T>) : f();
}

/**
 * Dos carriles independientes, cada uno con una sola ejecución a la vez:
 * - datos (casas, puntos, tuberías, arreglos): livianos, siempre primero;
 * - archivos (fotos y firmas): pesados; una foto lenta nunca frena los datos.
 * Si se pide un carril mientras corre, al terminar se repite para incluir lo nuevo.
 */
function carril(tarea: (r: ResultadoSync) => Promise<void>) {
  let enCurso: Promise<ResultadoSync> | null = null;
  let repetir = false;
  return (): Promise<ResultadoSync> => {
    if (enCurso) {
      repetir = true;
      return enCurso;
    }
    enCurso = (async () => {
      const r: ResultadoSync = { subidas: 0, fallidas: 0 };
      do {
        repetir = false;
        await tarea(r);
      } while (repetir && !r.sesionVencida && navigator.onLine);
      return r;
    })().finally(() => {
      enCurso = null;
    });
    return enCurso;
  };
}

const carrilDatos = carril((r) => conCandado("vereda-datos", () => subirDatos(r)));
const carrilArchivos = carril((r) => conCandado("vereda-archivos", () => subirArchivos(r)));

/** Sube todo lo pendiente: primero los datos, luego fotos y firmas. */
export async function sincronizar(): Promise<ResultadoSync> {
  const d = await carrilDatos();
  if (d.sesionVencida) return (marcarSesion(true), d);
  const a = await carrilArchivos();
  marcarSesion(Boolean(a.sesionVencida));
  return {
    subidas: d.subidas + a.subidas,
    fallidas: d.fallidas + a.fallidas,
    ultimoError: a.ultimoError ?? d.ultimoError,
    sesionVencida: a.sesionVencida,
  };
}

/**
 * Sube YA un solo registro (solo sus datos, que pesan poco) para poder abrir su ficha enseguida.
 * Las fotos y la firma quedan en la cola y suben en segundo plano.
 */
export async function subirAhora(tabla: "viviendas" | "operaciones", id: string): Promise<{ subido: boolean; error?: string }> {
  void pedirSubidaEnFondo();
  if (!navigator.onLine) return { subido: false };
  const reg = tabla === "viviendas" ? await dbLocal.viviendas.get(id) : await dbLocal.operaciones.get(id);
  if (!reg) return { subido: true };
  const url = tabla === "viviendas" ? "/api/sync/vivienda" : `/api/sync/${(reg as { tipo: string }).tipo}`;
  try {
    const res = await conTiempo(
      url,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reg.payload) },
      TIEMPO_GUARDAR,
    );
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      marcarSesion(true);
      return { subido: false, error: "Su sesión venció: quedó guardado en el teléfono. Ingrese de nuevo con señal para que suba." };
    }
    if (!res.ok || !body.ok) {
      const error = body.error ?? `Error ${res.status}`;
      await (tabla === "viviendas" ? dbLocal.viviendas : dbLocal.operaciones).update(id, { error });
      return { subido: false, error };
    }
    await (tabla === "viviendas" ? dbLocal.viviendas : dbLocal.operaciones).delete(id);
    return { subido: true };
  } catch (e) {
    if (esDeRed(e)) return { subido: false };
    return { subido: false, error: (e as Error).message };
  } finally {
    // Fotos, firma y cualquier otro pendiente siguen en segundo plano
    void sincronizar();
  }
}

/** Carril de datos: casas y registros del acueducto. Corta al primer error de red. */
async function subirDatos(r: ResultadoSync): Promise<void> {
  for (const p of await dbLocal.viviendas.orderBy("guardadoEn").toArray()) {
    try {
      const res = await conTiempo(
        "/api/sync/vivienda",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p.payload) },
        TIEMPO_DATOS,
      );
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) return void Object.assign(r, { sesionVencida: true, ultimoError: body.error });
      if (!res.ok || !body.ok) throw new Error(body.error ?? `Error ${res.status}`);
      await dbLocal.viviendas.delete(p.id);
      r.subidas++;
    } catch (e) {
      r.fallidas++;
      r.ultimoError = (e as Error).message;
      await dbLocal.viviendas.update(p.id, { intentos: p.intentos + 1, error: r.ultimoError });
      if (esDeRed(e)) return; // sin red o muy lenta: no seguir intentando
    }
  }

  // Red del acueducto y mantenimientos: primero puntos y tuberías, luego arreglos que los referencian
  const orden = { elemento: 0, tramo: 1, mantenimiento: 2, novedad: 3 } as const;
  const ops = (await dbLocal.operaciones.toArray()).sort(
    (a, b) => orden[a.tipo] - orden[b.tipo] || a.guardadoEn - b.guardadoEn,
  );
  for (const op of ops) {
    try {
      const res = await conTiempo(
        `/api/sync/${op.tipo}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(op.payload) },
        TIEMPO_DATOS,
      );
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) return void Object.assign(r, { sesionVencida: true, ultimoError: body.error });
      if (!res.ok || !body.ok) throw new Error(body.error ?? `Error ${res.status}`);
      await dbLocal.operaciones.delete(op.id);
      r.subidas++;
    } catch (e) {
      r.fallidas++;
      r.ultimoError = (e as Error).message;
      await dbLocal.operaciones.update(op.id, { intentos: op.intentos + 1, error: r.ultimoError });
      if (esDeRed(e)) return;
    }
  }
}

/** Carril de archivos: fotos y firmas, solo de registros que ya están en el servidor. */
async function subirArchivos(r: ResultadoSync): Promise<void> {
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
      fd.set("archivo", f.blob, `${f.id}.${f.tipo === "firma" ? "png" : "jpg"}`);
      const res = await conTiempo("/api/adjuntos", { method: "POST", body: fd }, TIEMPO_FOTO);
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) return void Object.assign(r, { sesionVencida: true, ultimoError: body.error });
      if (!res.ok || !body.ok) throw new Error(body.error ?? `Error ${res.status}`);
      await dbLocal.fotos.delete(f.id);
      r.subidas++;
    } catch (e) {
      r.fallidas++;
      r.ultimoError = (e as Error).message;
      await dbLocal.fotos.update(f.id, { intentos: f.intentos + 1, error: r.ultimoError });
      if (esDeRed(e)) return;
    }
  }
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
  return subirAhora("operaciones", op.id);
}
