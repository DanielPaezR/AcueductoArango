"use client";

import { Camera, MapPin, MessageSquareText, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Campo, Seccion, useGps } from "@/components/campos";
import { Coordenadas } from "@/components/coordenadas";
import { FotosPicker, type FotoNueva } from "@/components/fotos-picker";
import { MapaSelector } from "@/components/mapa/dinamicos";
import { svgNovedad } from "@/lib/novedades";
import { guardarOperacion } from "@/lib/offline/sync";
import { CATEGORIAS_NOVEDAD, ESTADOS_NOVEDAD, type CategoriaNovedad, type EstadoNovedad } from "@/lib/opciones";

type Novedad = { id: string; titulo: string; descripcion: string | null; categoria: CategoriaNovedad; estado: EstadoNovedad; lat: number | null; lng: number | null };

/** Registrar o corregir una novedad u obra. Funciona sin señal: queda en el teléfono y sube después. */
export function NovedadForm({ inicial }: { inicial?: Novedad }) {
  const router = useRouter();
  const editando = Boolean(inicial);
  const [n, setN] = useState<Novedad>(() => inicial ?? { id: crypto.randomUUID(), titulo: "", descripcion: "", categoria: "vias", estado: "pendiente", lat: null, lng: null });
  const [fotos, setFotos] = useState<FotoNueva[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();
  const [guardadoLocal, setGuardadoLocal] = useState(false);
  const gps = useGps();
  const pos: [number, number] | null = n.lat !== null && n.lng !== null ? [n.lat, n.lng] : null;
  const set = <K extends keyof Novedad>(k: K, v: Novedad[K]) => setN((x) => ({ ...x, [k]: v }));

  const guardar = async () => {
    setError(undefined);
    if (n.titulo.trim().length < 3) return setError("Escriba un título (por ejemplo: Derrumbe en la vía a La Loma).");
    if (!pos) return setError("Marque dónde queda: toque el mapa o use “Estoy en el sitio”.");
    setGuardando(true);
    gps.detener();
    const r = await guardarOperacion({ id: n.id, tipo: "novedad", etiqueta: `Novedad: ${n.titulo}`, payload: { ...n, lat: pos[0], lng: pos[1] } }, fotos);
    setGuardando(false);
    if (r.error) return setError(`El servidor respondió: ${r.error}`);
    if (r.subido) {
      router.push(`/novedades/${n.id}`);
      router.refresh();
    } else setGuardadoLocal(true);
  };

  if (guardadoLocal)
    return (
      <div className="tarjeta space-y-4 py-10 text-center">
        <Smartphone className="mx-auto size-12 text-marca-700" aria-hidden />
        <h2 className="text-xl font-bold">Guardada en el teléfono</h2>
        <p className="text-stone-600">No hay señal. La novedad se subirá sola cuando vuelva la conexión.</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button className="btn-primario" onClick={() => location.reload()}>Registrar otra</button>
          <Link className="btn-secundario" href="/viviendas/pendientes">Ver pendientes</Link>
        </div>
      </div>
    );

  return (
    <div className="space-y-4 pb-28">
      <Seccion titulo="¿Qué pasa o qué se va a hacer?" icono={MessageSquareText}>
        <Campo label="Título">
          <input className="input" placeholder="Ej: Derrumbe en la vía a La Loma" value={n.titulo} onChange={(e) => set("titulo", e.target.value)} maxLength={160} />
        </Campo>
        <Campo label="Tipo">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(CATEGORIAS_NOVEDAD).map(([k, c]) => (
              <button
                key={k}
                type="button"
                aria-pressed={n.categoria === k}
                onClick={() => set("categoria", k as CategoriaNovedad)}
                className={`flex min-h-12 items-center gap-2 rounded-lg border px-3 py-2 text-left text-[0.92rem] font-semibold ${
                  n.categoria === k ? "border-marca-700 bg-marca-50 text-marca-900 ring-2 ring-marca-600" : "border-stone-300 bg-white text-stone-800"
                }`}
              >
                <span className="size-3.5 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                {c.label}
              </button>
            ))}
          </div>
        </Campo>
        <Campo label="Detalles (opcional)">
          <textarea className="input" rows={4} placeholder="Qué se necesita, quién avisó, cuántas personas afecta…" value={n.descripcion ?? ""} onChange={(e) => set("descripcion", e.target.value)} />
        </Campo>
        <Campo label="Estado">
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(ESTADOS_NOVEDAD).map(([k, e]) => (
              <button
                key={k}
                type="button"
                aria-pressed={n.estado === k}
                onClick={() => set("estado", k as EstadoNovedad)}
                className={`btn border px-2 ${n.estado === k ? "border-marca-700 bg-marca-700 text-white" : "border-stone-300 bg-white text-stone-800"}`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </Campo>
      </Seccion>

      <Seccion titulo="¿Dónde queda?" icono={MapPin}>
        <p className="text-stone-600">Toque el mapa en el sitio o, si está allá, use el GPS.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-secundario"
            disabled={gps.estado === "buscando"}
            onClick={() => gps.iniciar((p) => setN((x) => ({ ...x, lat: p.coords.latitude, lng: p.coords.longitude })))}
          >
            {gps.estado === "buscando" ? "Buscando señal GPS…" : "Estoy en el sitio"}
          </button>
        </div>
        <Coordenadas
          pos={pos}
          onChange={([lat, lng]) => {
            gps.detener();
            setN((x) => ({ ...x, lat, lng }));
          }}
        />
        {gps.error && !pos && <p className="text-teja-700" role="alert">{gps.error}</p>}
        <MapaSelector
          pos={pos}
          iconoHtml={svgNovedad(n.categoria, n.estado, 30)}
          alfiler
          onChange={([lat, lng]) => {
            gps.detener();
            setN((x) => ({ ...x, lat, lng }));
          }}
        />
      </Seccion>

      <Seccion titulo={editando ? "Más fotos (opcional)" : "Fotos (opcional)"} icono={Camera}>
        <FotosPicker fotos={fotos} onChange={setFotos} etiqueta="Tomar foto" ancho={1600} />
      </Seccion>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgb(26_32_28/0.08)] lg:left-64">
        <div className="mx-auto max-w-3xl">
          {error && <p className="mb-2 rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{error}</p>}
          <button className="btn-primario w-full py-3 text-base" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar novedad"}
          </button>
        </div>
      </div>
    </div>
  );
}
