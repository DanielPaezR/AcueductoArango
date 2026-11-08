/* Service worker — Vereda
 * - Archivos estáticos de Next (/_next/static): cache-first (tienen hash, nunca cambian).
 * - Páginas: network-first; si no hay señal, se sirve la última versión guardada.
 * - Teselas del mapa satelital: se guardan las que se ven con señal para poder verlas sin ella.
 */
const VERSION = "v1";
const C_ESTATICO = `estatico-${VERSION}`;
const C_PAGINAS = `paginas-${VERSION}`;
const C_TESELAS = "teselas-v1";
const MAX_TESELAS = 3000;

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

// La app pide precargar las páginas de trabajo en campo cuando hay sesión y señal
self.addEventListener("message", (e) => {
  if (e.data?.tipo === "precargar" && Array.isArray(e.data.urls)) {
    e.waitUntil(
      caches.open(C_PAGINAS).then((c) =>
        Promise.all(
          e.data.urls.map((u) =>
            fetch(u, { credentials: "same-origin" })
              .then((r) => (r.ok && !r.redirected ? c.put(u, r) : null))
              .catch(() => null),
          ),
        ),
      ),
    );
  }
});

const esTesela = (url) =>
  url.hostname.endsWith("arcgisonline.com") || url.hostname.endsWith("tile.openstreetmap.org");

async function recortarTeselas() {
  const c = await caches.open(C_TESELAS);
  const ks = await c.keys();
  if (ks.length > MAX_TESELAS) await Promise.all(ks.slice(0, ks.length - MAX_TESELAS).map((k) => c.delete(k)));
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
        const hit = await c.match(req);
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
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copia = res.clone();
            caches.open(C_PAGINAS).then((c) => c.put(url.pathname, copia));
          }
          return res;
        })
        .catch(async () => {
          const c = await caches.open(C_PAGINAS);
          return (await c.match(url.pathname)) ?? (await c.match("/offline.html"));
        }),
    );
  }
});
