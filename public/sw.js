/* Service worker — Vereda
 * - Archivos estáticos de Next (/_next/static): cache-first (tienen hash, nunca cambian).
 * - Páginas: red primero, con tiempo límite; si no hay señal o es muy débil, se sirve la última versión guardada.
 * - Páginas de campo: se precargan con todos sus archivos (JS/CSS) para que funcionen sin señal
 *   aunque nunca se hayan abierto desde la última actualización del sistema.
 * - Teselas del mapa satelital: se guardan las que se ven con señal para poder verlas sin ella.
 * - Subida en segundo plano (Background Sync): lo guardado sin señal sube apenas vuelve la señal,
 *   aunque la app esté cerrada.
 */
const VERSION = "v3";
const C_ESTATICO = `estatico-${VERSION}`;
const C_PAGINAS = `paginas-${VERSION}`;
const C_TESELAS = "teselas-v1";
const MAX_TESELAS = 3000;
/** Con señal débil, a los 6 s se muestra la copia guardada en vez de dejar la pantalla en blanco. */
const TIEMPO_PAGINA = 6000;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(C_PAGINAS).then((c) => c.add("/offline.html")));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) =>
        Promise.all(ks.filter((k) => ![C_ESTATICO, C_PAGINAS, C_TESELAS].includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Guarda una página y todos los archivos de Next que necesita para funcionar sin señal. */
async function precargar(url) {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok || res.redirected) return;
  const html = await res.clone().text();
  await (await caches.open(C_PAGINAS)).put(url, res);
  const archivos = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])];
  const est = await caches.open(C_ESTATICO);
  await Promise.all(
    archivos.map(async (a) => {
      if (await est.match(a)) return;
      const r = await fetch(a).catch(() => null);
      if (r?.ok) await est.put(a, r);
    }),
  );
}

self.addEventListener("message", (e) => {
  // La app pide precargar las páginas de trabajo en campo cuando hay sesión y señal
  if (e.data?.tipo === "precargar" && Array.isArray(e.data.urls)) {
    e.waitUntil(Promise.all(e.data.urls.map((u) => precargar(u).catch(() => null))));
  }
});

const esTesela = (url) =>
  url.hostname.endsWith("arcgisonline.com") || url.hostname.endsWith("tile.openstreetmap.org");

async function recortarTeselas() {
  const c = await caches.open(C_TESELAS);
  const ks = await c.keys();
  if (ks.length > MAX_TESELAS) await Promise.all(ks.slice(0, ks.length - MAX_TESELAS).map((k) => c.delete(k)));
}

/** fetch que se rinde a los `ms` milisegundos (la señal débil a veces nunca responde). */
function conTiempo(req, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(req, { signal: ctrl.signal }).finally(() => clearTimeout(t));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (esTesela(url)) {
    e.respondWith(
      caches.open(C_TESELAS).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === "opaque") {
          c.put(req, res.clone());
          if (Math.random() < 0.02) recortarTeselas();
        }
        return res;
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.open(C_ESTATICO).then(async (c) => {
        const hit = await c.match(req, { ignoreSearch: true });
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        const c = await caches.open(C_PAGINAS);
        const guardada = await c.match(url.pathname);
        const red = fetch(req).then((res) => {
          if (res.ok && !res.redirected) c.put(url.pathname, res.clone());
          return res;
        });
        red.catch(() => {});
        try {
          // Si hay copia guardada, no se espera más de TIEMPO_PAGINA a la red (la copia se actualiza igual
          // cuando la red responda); si no la hay, se espera lo necesario
          if (!guardada) return await red;
          const limite = new Promise((_, mal) => setTimeout(() => mal(new Error("lenta")), TIEMPO_PAGINA));
          return await Promise.race([red, limite]);
        } catch {
          return guardada ?? (await c.match("/offline.html"));
        }
      })(),
    );
  }
});

/* ------------------------------------------------------------------ */
/* Subida en segundo plano: lee la misma base local (IndexedDB "vereda") que usa la app.            */
/* Usa los mismos candados que la app, así nunca suben el mismo registro dos a la vez.              */
/* ------------------------------------------------------------------ */

function abrirBD() {
  return new Promise((ok, mal) => {
    const r = indexedDB.open("vereda");
    r.onupgradeneeded = () => r.transaction.abort(); // no existe todavía: nada que subir
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}
const pedir = (r) => new Promise((ok, mal) => ((r.onsuccess = () => ok(r.result)), (r.onerror = () => mal(r.error))));
const todos = (bd, t) => (bd.objectStoreNames.contains(t) ? pedir(bd.transaction(t).objectStore(t).getAll()) : Promise.resolve([]));
const borrar = (bd, t, id) => pedir(bd.transaction(t, "readwrite").objectStore(t).delete(id));
const anotar = (bd, t, x, error) => pedir(bd.transaction(t, "readwrite").objectStore(t).put({ ...x, intentos: (x.intentos ?? 0) + 1, error }));
const candado = (n, f) => (self.navigator.locks ? self.navigator.locks.request(n, f) : f());

class SinRed extends Error {}
class SinSesion extends Error {}

/** Envía un registro; true si quedó en el servidor. Lanza SinRed / SinSesion para cortar. */
async function enviar(url, init, ms) {
  let res;
  try {
    res = await conTiempo(new Request(url, { ...init, credentials: "same-origin" }), ms);
  } catch {
    throw new SinRed();
  }
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) throw new SinSesion();
  if (!res.ok || !body.ok) return body.error ?? `Error ${res.status}`;
  return true;
}

async function subirPendientes() {
  const bd = await abrirBD().catch(() => null);
  if (!bd) return 0;
  let subidas = 0;
  try {
    await candado("vereda-datos", async () => {
      const casas = (await todos(bd, "viviendas")).sort((a, b) => a.guardadoEn - b.guardadoEn);
      const orden = { elemento: 0, tramo: 1, mantenimiento: 2, novedad: 3 };
      const ops = (await todos(bd, "operaciones")).sort((a, b) => (orden[a.tipo] ?? 9) - (orden[b.tipo] ?? 9) || a.guardadoEn - b.guardadoEn);
      const json = (p) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      for (const [tabla, x, url] of [...casas.map((c) => ["viviendas", c, "/api/sync/vivienda"]), ...ops.map((o) => ["operaciones", o, `/api/sync/${o.tipo}`])]) {
        const r = await enviar(url, json(x.payload), 20000);
        if (r === true) {
          await borrar(bd, tabla, x.id);
          subidas++;
        } else await anotar(bd, tabla, x, r);
      }
    });
    await candado("vereda-archivos", async () => {
      const esperando = new Set([...(await todos(bd, "viviendas")), ...(await todos(bd, "operaciones"))].map((x) => x.id));
      const fotos = (await todos(bd, "fotos")).sort((a, b) => a.guardadoEn - b.guardadoEn);
      for (const f of fotos) {
        if (esperando.has(f.entidadId)) continue;
        const fd = new FormData();
        for (const k of ["id", "entidad", "entidadId", "tipo"]) fd.set(k, f[k]);
        fd.set("archivo", f.blob, `${f.id}.${f.tipo === "firma" ? "png" : "jpg"}`);
        const r = await enviar("/api/adjuntos", { method: "POST", body: fd }, 90000);
        if (r === true) {
          await borrar(bd, "fotos", f.id);
          subidas++;
        } else await anotar(bd, "fotos", f, r);
      }
    });
  } finally {
    bd.close();
    if (subidas) for (const c of await self.clients.matchAll()) c.postMessage({ tipo: "sincronizado", subidas });
  }
  return subidas;
}

self.addEventListener("sync", (e) => {
  if (e.tag !== "subir-pendientes") return;
  e.waitUntil(
    subirPendientes().catch((err) => {
      // Sin señal: rechazar hace que el navegador lo reintente más tarde por su cuenta.
      // Sesión vencida: no se reintenta en fondo; la app pide entrar de nuevo y ahí sube.
      if (err instanceof SinRed) throw err;
    }),
  );
});
