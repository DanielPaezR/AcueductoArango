"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, useMap } from "react-leaflet";
import { CENTRO_MUNICIPIO } from "@/lib/opciones";
import { CapasBase } from "./capas";
import { MarcadoresNovedad, type PuntoNovedad } from "./novedades";

export type CasaMunicipio = { id: string; vereda_id: number; codigo: string | null; lat: number; lng: number; personas: number; jefe: string | null; pendiente: boolean };

function Encuadrar({ puntos }: { puntos: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length) map.fitBounds(L.latLngBounds(puntos.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 16 });
  }, [puntos, map]);
  return null;
}

/** Mapa de la alcaldía: casas de todas las veredas (un solo color; la vereda se filtra) y novedades activas. */
export default function MapaMunicipio({
  casas,
  novedades,
  veredas,
}: {
  casas: CasaMunicipio[];
  novedades: (PuntoNovedad & { vereda_id: number })[];
  veredas: { id: number; nombre: string }[];
}) {
  const [vereda, setVereda] = useState("");
  const [verNovedades, setVerNovedades] = useState(true);
  const nombre = useMemo(() => new Map(veredas.map((v) => [v.id, v.nombre])), [veredas]);
  const c = casas.filter((x) => !vereda || String(x.vereda_id) === vereda);
  const n = novedades.filter((x) => !vereda || String(x.vereda_id) === vereda);
  const todos = useMemo(() => [...c, ...n], [c, n]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-white px-3 py-2.5">
        <select className="input min-h-10 w-auto py-1.5" aria-label="Vereda" value={vereda} onChange={(e) => setVereda(e.target.value)}>
          <option value="">Todas las veredas</option>
          {veredas.map((v) => (
            <option key={v.id} value={v.id}>{v.nombre}</option>
          ))}
        </select>
        <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 font-semibold">
          <input type="checkbox" className="size-4 accent-marca-700" checked={verNovedades} onChange={(e) => setVerNovedades(e.target.checked)} />
          Novedades (<span className="num">{n.length}</span>)
        </label>
        <span className="text-stone-700" role="status">
          <span className="num font-bold">{c.length}</span> casas
        </span>
      </div>
      <div className="relative isolate min-h-0 flex-1">
        <MapContainer center={CENTRO_MUNICIPIO} zoom={12} className="absolute inset-0" preferCanvas>
          <CapasBase />
          <Encuadrar puntos={todos} />
          {c.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={7}
              pathOptions={p.pendiente ? { color: "#6e4c0c", weight: 2, dashArray: "3 3", fillColor: "#fff", fillOpacity: 0.85 } : { color: "#fff", weight: 2, fillColor: "#1f5a3a", fillOpacity: 0.9 }}
            >
              <Popup>
                <div className="min-w-44 space-y-1 text-[0.95rem]">
                  <div className="font-bold">{p.jefe ?? (p.pendiente ? "Encuesta pendiente" : "Familia (sin autorización para la alcaldía)")}</div>
                  <div className="text-stone-600">
                    Vereda {nombre.get(p.vereda_id)} · <span className="num">{p.codigo}</span> · <span className="num">{p.personas}</span> persona(s)
                  </div>
                  {p.jefe && (
                    <Link href={`/municipio/familias/${p.id}`} className="font-semibold text-marca-700 underline">Ver familia y ayudas</Link>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
          {verNovedades && <MarcadoresNovedad puntos={n} />}
        </MapContainer>
        <div className="absolute bottom-8 left-3 z-[1000] space-y-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold shadow-[0_2px_8px_rgb(0_0_0/0.3)]">
          <div><span className="mr-1.5 inline-block size-3.5 rounded-full bg-marca-800 align-middle" />Vivienda censada</div>
          <div><span className="mr-1.5 inline-block size-3.5 rounded-full border-2 border-dashed border-ocre-800 bg-white align-middle" />Encuesta pendiente</div>
        </div>
      </div>
    </div>
  );
}
