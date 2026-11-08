"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Check, LocateFixed, Plus, Spline, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, useMap, useMapEvents } from "react-leaflet";
import { guardarOperacion } from "@/lib/offline/sync";
import { CENTRO_MUNICIPIO } from "@/lib/opciones";
import {
  ESTADOS_RED,
  longitudMetros,
  MATERIALES_TUBO,
  svgElemento,
  TIPOS_ELEMENTO,
  TIPOS_TRAMO,
  type EstadoRed,
  type TipoElemento,
  type TipoTramo,
} from "@/lib/red";
import { CapasBase } from "./capas";

export type ElementoMapa = { id: string; tipo: string; nombre: string | null; lat: number; lng: number; estado: string };
export type TramoMapa = {
  id: string;
  tipo: string;
  nombre: string | null;
  coordenadas: [number, number][];
  estado: string;
  diametroPulg: string | null;
  material: string | null;
  longitudM: number | null;
};
export type CasaMapa = { id: string; lat: number; lng: number; codigo: string | null };

const COLOR_TUBO: Record<string, string> = {
  aduccion: "#0f3d5e",
  conduccion: "#164a70",
  distribucion: "#1f6698",
  acometida: "#5b9bc8",
};

function Encuadrar({ elementos, tramos, casas }: { elementos: ElementoMapa[]; tramos: TramoMapa[]; casas: CasaMapa[] }) {
  const map = useMap();
  useEffect(() => {
    const pts: [number, number][] = [
      ...elementos.map((e) => [e.lat, e.lng] as [number, number]),
      ...tramos.flatMap((t) => t.coordenadas),
      ...casas.map((c) => [c.lat, c.lng] as [number, number]),
    ];
    if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 17 });
    // solo al cargar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function ClicDibujo({ activo, onPunto }: { activo: boolean; onPunto: (p: [number, number]) => void }) {
  useMapEvents({ click: (e) => activo && onPunto([e.latlng.lat, e.latlng.lng]) });
  return null;
}

function Ubicarme({ onPos }: { onPos: (p: [number, number]) => void }) {
  const map = useMap();
  return (
    <button
      type="button"
      className="absolute right-3 bottom-8 z-[1000] inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-4 font-semibold text-stone-900 shadow-[0_2px_8px_rgb(0_0_0/0.3)]"
      onClick={() =>
        navigator.geolocation.getCurrentPosition(
          (p) => {
            const ll: [number, number] = [p.coords.latitude, p.coords.longitude];
            onPos(ll);
            map.setView(ll, 18);
          },
          () => alert("No se pudo obtener su ubicación"),
          { enableHighAccuracy: true, timeout: 15000 },
        )
      }
    >
      <LocateFixed className="size-5 text-postigo-700" aria-hidden />
      Dónde estoy
    </button>
  );
}

/** Formulario para guardar la tubería recién dibujada. */
function FormTramo({ puntos, onCancelar, onGuardado }: { puntos: [number, number][]; onCancelar: () => void; onGuardado: (msg: string) => void }) {
  const [tipo, setTipo] = useState<TipoTramo>("distribucion");
  const [estado, setEstado] = useState<EstadoRed>("operativo");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();

  const guardar = async (form: FormData) => {
    setGuardando(true);
    setError(undefined);
    const num = (k: string) => (form.get(k) ? Number(String(form.get(k)).replace(",", ".")) : null);
    const id = crypto.randomUUID();
    const r = await guardarOperacion({
      id,
      tipo: "tramo",
      etiqueta: `Tubería: ${String(form.get("nombre") || TIPOS_TRAMO[tipo].corto)}`,
      payload: {
        id,
        tipo,
        estado,
        coordenadas: puntos,
        nombre: String(form.get("nombre") ?? "") || null,
        diametroPulg: num("diametroPulg"),
        material: String(form.get("material") ?? "") || null,
        anioInstalacion: num("anioInstalacion"),
        observaciones: String(form.get("observaciones") ?? "") || null,
      },
    });
    setGuardando(false);
    if (r.error) return setError(r.error);
    onGuardado(r.subido ? "Tubería guardada" : "Tubería guardada en el teléfono; se subirá cuando haya señal");
  };

  return (
    <form action={guardar} className="space-y-3 border-t border-stone-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">Guardar tubería</h2>
        <span className="num text-stone-600">
          {puntos.length} puntos · {longitudMetros(puntos)} m
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="tipoTramo">Tipo</label>
          <select id="tipoTramo" className="input" value={tipo} onChange={(e) => setTipo(e.target.value as TipoTramo)}>
            {Object.entries(TIPOS_TRAMO).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="nombreTramo">Nombre (opcional)</label>
          <input id="nombreTramo" name="nombre" className="input" placeholder="Ej: Ramal La Loma" />
        </div>
        <div>
          <label className="label" htmlFor="diametroPulg">Diámetro (pulgadas)</label>
          <input id="diametroPulg" name="diametroPulg" className="input num" inputMode="decimal" placeholder="Ej: 1.5" />
        </div>
        <div>
          <label className="label" htmlFor="material">Material</label>
          <select id="material" name="material" className="input" defaultValue="">
            <option value="">—</option>
            {MATERIALES_TUBO.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="anioInstalacion">Año de instalación</label>
          <input id="anioInstalacion" name="anioInstalacion" className="input num" inputMode="numeric" />
        </div>
        <div>
          <label className="label" htmlFor="estadoTramo">Estado</label>
          <select id="estadoTramo" className="input" value={estado} onChange={(e) => setEstado(e.target.value as EstadoRed)}>
            {Object.entries(ESTADOS_RED).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-secundario flex-1" onClick={onCancelar}>Volver a dibujar</button>
        <button className="btn-primario flex-1" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}

export default function MapaRed({
  elementos,
  tramos,
  casas,
  puedeCrear,
}: {
  elementos: ElementoMapa[];
  tramos: TramoMapa[];
  casas: CasaMapa[];
  puedeCrear: boolean;
}) {
  const router = useRouter();
  const [verCasas, setVerCasas] = useState(true);
  const [modo, setModo] = useState<"ver" | "dibujar" | "guardar">("ver");
  const [puntos, setPuntos] = useState<[number, number][]>([]);
  const [aviso, setAviso] = useState<string>();
  const iconos = useMemo(() => {
    const m = new Map<string, L.DivIcon>();
    for (const e of elementos) {
      const k = `${e.tipo}|${e.estado}`;
      if (!m.has(k)) m.set(k, L.divIcon({ className: "", html: svgElemento(e.tipo, e.estado, 28), iconSize: [28, 28], iconAnchor: [14, 14] }));
    }
    return m;
  }, [elementos]);

  const agregarGps = () =>
    navigator.geolocation.getCurrentPosition(
      (p) => setPuntos((xs) => [...xs, [p.coords.latitude, p.coords.longitude]]),
      () => alert("No se pudo obtener su ubicación"),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );

  return (
    <div className="flex h-full flex-col">
      {modo === "ver" && (
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-white px-3 py-2.5">
          {puedeCrear && (
            <>
              <Link href="/acueducto/punto/nuevo" className="btn-primario min-h-11 px-3.5">
                <Plus className="size-5" aria-hidden />
                Punto
              </Link>
              <button type="button" className="btn-secundario min-h-11 px-3.5" onClick={() => setModo("dibujar")}>
                <Spline className="size-5" aria-hidden />
                Tubería
              </button>
            </>
          )}
          <label className="ml-auto flex items-center gap-2 text-stone-700">
            <input type="checkbox" className="size-5 accent-postigo-600" checked={verCasas} onChange={(e) => setVerCasas(e.target.checked)} />
            Casas
          </label>
        </div>
      )}
      {modo === "dibujar" && (
        <div className="space-y-2 border-b border-stone-200 bg-ocre-50 px-3 py-2.5">
          <p className="font-semibold text-ocre-800">
            Toque el mapa por donde pasa el tubo, o camine sobre él y use “Agregar mi ubicación”. Lleva{" "}
            <span className="num">{puntos.length}</span> puntos · <span className="num">{longitudMetros(puntos)}</span> m.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secundario min-h-11 px-3" onClick={agregarGps}>
              <LocateFixed className="size-5" aria-hidden />
              Agregar mi ubicación
            </button>
            <button type="button" className="btn-secundario min-h-11 px-3" disabled={!puntos.length} onClick={() => setPuntos((xs) => xs.slice(0, -1))}>
              <Undo2 className="size-5" aria-hidden />
              Deshacer
            </button>
            <button type="button" className="btn-secundario min-h-11 px-3" onClick={() => (setPuntos([]), setModo("ver"))}>
              <X className="size-5" aria-hidden />
              Cancelar
            </button>
            <button type="button" className="btn-primario min-h-11 px-3" disabled={puntos.length < 2} onClick={() => setModo("guardar")}>
              <Check className="size-5" aria-hidden />
              Terminar
            </button>
          </div>
        </div>
      )}
      {aviso && modo === "ver" && (
        <p className="bg-marca-50 px-4 py-2 font-semibold text-marca-800" role="status">
          {aviso}
        </p>
      )}

      <div className="relative min-h-0 flex-1">
        <MapContainer center={CENTRO_MUNICIPIO} zoom={14} className="absolute inset-0">
          <CapasBase />
          <Encuadrar elementos={elementos} tramos={tramos} casas={casas} />
          <ClicDibujo activo={modo === "dibujar"} onPunto={(p) => setPuntos((xs) => [...xs, p])} />
          {modo === "ver" && <Ubicarme onPos={() => {}} />}

          {tramos.map((t) => {
            const falla = t.estado !== "operativo";
            return (
              <Polyline
                key={t.id}
                positions={t.coordenadas}
                pathOptions={{
                  color: falla ? ESTADOS_RED[t.estado as EstadoRed]?.color : COLOR_TUBO[t.tipo],
                  weight: TIPOS_TRAMO[t.tipo as TipoTramo]?.peso ?? 3,
                  opacity: 0.95,
                  dashArray: falla ? "8 6" : undefined,
                }}
              >
                {modo === "ver" && (
                  <Popup>
                    <div className="min-w-44 space-y-1 text-[0.95rem]">
                      <div className="text-base font-bold">{t.nombre ?? TIPOS_TRAMO[t.tipo as TipoTramo]?.corto}</div>
                      <div className="text-stone-700">
                        {[TIPOS_TRAMO[t.tipo as TipoTramo]?.corto, t.diametroPulg && `${Number(t.diametroPulg)}″`, t.material, t.longitudM && `${t.longitudM} m`]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      <div style={{ color: ESTADOS_RED[t.estado as EstadoRed]?.color }} className="font-semibold">
                        {ESTADOS_RED[t.estado as EstadoRed]?.label}
                      </div>
                      <Link href={`/acueducto/tramo/${t.id}`} className="inline-block pt-1 font-bold text-marca-700 underline">Ver detalle</Link>
                    </div>
                  </Popup>
                )}
              </Polyline>
            );
          })}

          {verCasas &&
            casas.map((c) => (
              <CircleMarker key={c.id} center={[c.lat, c.lng]} radius={5} pathOptions={{ color: "#fff", weight: 1.5, fillColor: "#5b9bc8", fillOpacity: 0.9 }}>
                {modo === "ver" && (
                  <Popup>
                    <Link href={`/viviendas/${c.id}`} className="font-bold text-marca-700 underline">Casa {c.codigo}</Link>
                  </Popup>
                )}
              </CircleMarker>
            ))}

          {elementos.map((e) => (
            <Marker key={e.id} position={[e.lat, e.lng]} icon={iconos.get(`${e.tipo}|${e.estado}`)!}>
              {modo === "ver" && (
                <Popup>
                  <div className="min-w-44 space-y-1 text-[0.95rem]">
                    <div className="text-base font-bold">{e.nombre ?? TIPOS_ELEMENTO[e.tipo as TipoElemento]?.label}</div>
                    <div className="text-stone-700">{TIPOS_ELEMENTO[e.tipo as TipoElemento]?.label}</div>
                    <div style={{ color: ESTADOS_RED[e.estado as EstadoRed]?.color }} className="font-semibold">
                      {ESTADOS_RED[e.estado as EstadoRed]?.label}
                    </div>
                    <Link href={`/acueducto/punto/${e.id}`} className="inline-block pt-1 font-bold text-marca-700 underline">Ver detalle</Link>
                  </div>
                </Popup>
              )}
            </Marker>
          ))}

          {puntos.length > 0 && (
            <>
              <Polyline positions={puntos} pathOptions={{ color: "#c48a1c", weight: 5, dashArray: "2 8", lineCap: "round" }} />
              {puntos.map((p, i) => (
                <CircleMarker key={i} center={p} radius={6} pathOptions={{ color: "#fff", weight: 2, fillColor: "#c48a1c", fillOpacity: 1 }} />
              ))}
            </>
          )}
        </MapContainer>

        {modo === "ver" && (
          <details className="absolute bottom-8 left-3 z-[1000] max-w-[60%] rounded-lg bg-white px-3 py-2 text-sm font-semibold shadow-[0_2px_8px_rgb(0_0_0/0.3)]">
            <summary className="flex min-h-8 cursor-pointer items-center">Leyenda</summary>
            <div className="mt-1 space-y-1">
            {Object.entries(ESTADOS_RED).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className="inline-block size-3 rounded-sm" style={{ background: v.color }} aria-hidden />
                {v.label}
              </div>
            ))}
            <div className="space-y-0.5 border-t border-stone-200 pt-1 font-normal text-stone-700">
              {(
                [
                  ["bocatoma", "Captación"],
                  ["tanque_almacenamiento", "Tanques"],
                  ["valvula", "Válvulas"],
                  ["hidrante", "Otros"],
                ] as const
              ).map(([t, l]) => (
                <div key={t} className="flex items-center gap-1.5">
                  <span aria-hidden dangerouslySetInnerHTML={{ __html: svgElemento(t, "operativo", 16) }} className="flex" />
                  {l}
                </div>
              ))}
            </div>
            </div>
          </details>
        )}
      </div>

      {modo === "guardar" && (
        <FormTramo
          puntos={puntos}
          onCancelar={() => setModo("dibujar")}
          onGuardado={(msg) => {
            setPuntos([]);
            setModo("ver");
            setAviso(msg);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
