"use client";

import { Camera, Droplets, MapPin, Plus, Smartphone, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Campo, Seccion, useGps } from "@/components/campos";
import { MapaSelector } from "@/components/mapa/dinamicos";
import { comprimirImagen, guardarOperacion } from "@/lib/offline/sync";
import { CAMPOS_DATOS, ESTADOS_RED, svgElemento, TIPOS_ELEMENTO, type EstadoRed, type TipoElemento } from "@/lib/red";
import type { ElementoInput } from "@/lib/validacion";

type Elemento = Omit<ElementoInput, "lat" | "lng"> & { lat: number | null; lng: number | null };

export function ElementoForm({ inicial }: { inicial?: Elemento }) {
  const router = useRouter();
  const editando = Boolean(inicial);
  const [e, setE] = useState<Elemento>(
    () => inicial ?? { id: crypto.randomUUID(), tipo: "valvula", lat: null, lng: null, estado: "operativo", datos: {} },
  );
  const [fotos, setFotos] = useState<{ id: string; blob: Blob; url: string }[]>([]);
  const [verMapa, setVerMapa] = useState(editando);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();
  const [guardadoLocal, setGuardadoLocal] = useState(false);
  const gps = useGps();
  const pos: [number, number] | null = e.lat !== null && e.lng !== null ? [e.lat, e.lng] : null;
  const set = <K extends keyof Elemento>(k: K, v: Elemento[K]) => setE((x) => ({ ...x, [k]: v }));
  const campos = TIPOS_ELEMENTO[e.tipo as TipoElemento].campos as readonly string[];

  const tomarGps = () =>
    gps.iniciar((p) =>
      setE((x) => ({
        ...x,
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        precisionM: Math.round(p.coords.accuracy * 10) / 10,
        altitudM: p.coords.altitude !== null ? Math.round(p.coords.altitude) : null,
      })),
    );

  useEffect(() => {
    if (!editando) tomarGps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardar = async () => {
    setError(undefined);
    if (!pos) return setError("Falta la ubicación: use el GPS o marque el punto en el mapa.");
    setGuardando(true);
    gps.detener();
    // Solo se guardan los datos que aplican al tipo elegido
    const datos = Object.fromEntries(Object.entries(e.datos ?? {}).filter(([k, v]) => campos.includes(k) && v !== ""));
    const r = await guardarOperacion(
      {
        id: e.id,
        tipo: "elemento",
        etiqueta: `${TIPOS_ELEMENTO[e.tipo as TipoElemento].label}${e.nombre ? `: ${e.nombre}` : ""}`,
        payload: { ...e, lat: pos[0], lng: pos[1], datos },
      },
      fotos,
    );
    setGuardando(false);
    if (r.error) return setError(`El servidor respondió: ${r.error}`);
    if (r.subido) {
      router.push(`/acueducto/punto/${e.id}`);
      router.refresh();
    } else setGuardadoLocal(true);
  };

  if (guardadoLocal)
    return (
      <div className="tarjeta space-y-4 py-10 text-center">
        <Smartphone className="mx-auto size-12 text-marca-700" aria-hidden />
        <h2 className="text-xl font-bold">Guardado en el teléfono</h2>
        <p className="text-stone-600">No hay señal. El punto se subirá solo cuando vuelva la conexión.</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button className="btn-primario" onClick={() => location.reload()}>
            Registrar otro punto
          </button>
          <Link className="btn-secundario" href="/viviendas/pendientes">Ver pendientes</Link>
        </div>
      </div>
    );

  return (
    <div className="space-y-4 pb-28">
      <Seccion titulo="¿Qué es?" icono={Droplets}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(TIPOS_ELEMENTO).map(([k, v]) => (
            <button
              key={k}
              type="button"
              aria-pressed={e.tipo === k}
              onClick={() => set("tipo", k as TipoElemento)}
              className={`flex min-h-14 items-center gap-2 rounded-lg border px-3 py-2 text-left text-[0.95rem] font-semibold ${
                e.tipo === k ? "border-marca-700 bg-marca-50 text-marca-900 ring-2 ring-marca-600" : "border-stone-300 bg-white text-stone-800"
              }`}
            >
              <span aria-hidden className="flex shrink-0" dangerouslySetInnerHTML={{ __html: svgElemento(k, e.estado ?? "operativo", 20) }} />
              {v.label}
            </button>
          ))}
        </div>
        <Campo label="Nombre (opcional)">
          <input className="input" placeholder="Ej: Tanque principal, Llave de La Loma" value={e.nombre ?? ""} onChange={(x) => set("nombre", x.target.value)} />
        </Campo>
      </Seccion>

      <Seccion titulo="Ubicación" icono={MapPin}>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primario" onClick={tomarGps} disabled={gps.estado === "buscando"}>
            {gps.estado === "buscando" ? "Buscando señal GPS…" : pos ? "Volver a tomar GPS" : "Tomar ubicación GPS"}
          </button>
          <button type="button" className="btn-secundario" onClick={() => setVerMapa(!verMapa)}>
            {verMapa ? "Ocultar mapa" : "Ajustar en el mapa"}
          </button>
        </div>
        {pos ? (
          <p className="num text-stone-700">
            {pos[0].toFixed(6)}, {pos[1].toFixed(6)}
            {e.precisionM != null && <> · ± {Math.round(e.precisionM)} m</>}
            {e.altitudM != null && <> · {e.altitudM} m s.n.m.</>}
          </p>
        ) : (
          <p className="text-stone-600">Párese junto al punto y tome la ubicación.</p>
        )}
        {gps.error && <p className="text-teja-700" role="alert">{gps.error}</p>}
        {verMapa && (
          <MapaSelector
            pos={pos}
            precision={e.precisionM}
            iconoHtml={svgElemento(e.tipo, e.estado ?? "operativo", 30)}
            onChange={([lat, lng]) => {
              gps.detener();
              setE((x) => ({ ...x, lat, lng, precisionM: null }));
            }}
          />
        )}
      </Seccion>

      <Seccion titulo="Estado y datos" icono={Droplets}>
        <Campo label="¿Cómo está?">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(ESTADOS_RED).map(([k, v]) => (
              <button
                key={k}
                type="button"
                aria-pressed={e.estado === k}
                onClick={() => set("estado", k as EstadoRed)}
                className={`btn border px-2 ${e.estado === k ? "text-white" : "border-stone-300 bg-white text-stone-800"}`}
                style={e.estado === k ? { background: v.color, borderColor: v.color } : undefined}
              >
                {v.label}
              </button>
            ))}
          </div>
        </Campo>
        {campos.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {campos.map((k) => (
              <Campo key={k} label={CAMPOS_DATOS[k].label}>
                <input
                  className={`input ${CAMPOS_DATOS[k].numero ? "num" : ""}`}
                  inputMode={CAMPOS_DATOS[k].numero ? "decimal" : undefined}
                  placeholder={CAMPOS_DATOS[k].placeholder}
                  value={String(e.datos?.[k] ?? "")}
                  onChange={(x) => {
                    const val = x.target.value;
                    const n = Number(val.replace(",", "."));
                    set("datos", { ...e.datos, [k]: CAMPOS_DATOS[k].numero && val !== "" && Number.isFinite(n) ? n : val });
                  }}
                />
              </Campo>
            ))}
          </div>
        )}
        <Campo label="Observaciones (opcional)">
          <textarea className="input" rows={2} value={e.observaciones ?? ""} onChange={(x) => set("observaciones", x.target.value)} />
        </Campo>
      </Seccion>

      <Seccion titulo="Fotos (opcional)" icono={Camera}>
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
            Tomar foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={async (x) => {
                const files = Array.from(x.target.files ?? []);
                const nuevas = await Promise.all(
                  files.map(async (f) => {
                    const blob = await comprimirImagen(f);
                    return { id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) };
                  }),
                );
                setFotos((xs) => [...xs, ...nuevas]);
              }}
            />
          </label>
        </div>
      </Seccion>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgb(26_32_28/0.08)] lg:left-64">
        <div className="mx-auto max-w-3xl">
          {error && <p className="mb-2 rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{error}</p>}
          <button className="btn-primario w-full py-3 text-base" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar punto"}
          </button>
        </div>
      </div>
    </div>
  );
}
