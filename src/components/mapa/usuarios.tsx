"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LocateFixed } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, useMap } from "react-leaflet";
import { CENTRO_MUNICIPIO } from "@/lib/opciones";
import { CapasBase } from "./capas";

export type PuntoVivienda = {
  id: string;
  codigo: string | null;
  lat: number;
  lng: number;
  sectorId: number | null;
  usaAcueducto: boolean;
  estado: string;
  jefe: string | null;
  personas: number;
  referencia: string | null;
  proyectos: string[];
};

/** Colores para sectores sin color propio: pinturas de puertas y balcones. */
const COLORES = ["#c48a1c", "#a8382c", "#7a4fa0", "#2a6b48", "#d0632a", "#3f7f8c", "#8c6d3f", "#b8487a"];
const AGUA = "#1f6698";
const SIN_AGUA = "#e0a526";

function Encuadrar({ puntos }: { puntos: PuntoVivienda[] }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length) map.fitBounds(L.latLngBounds(puntos.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 17 });
    // solo al cargar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function MiUbicacion() {
  const map = useMap();
  const [pos, setPos] = useState<[number, number] | null>(null);
  return (
    <>
      <button
        type="button"
        className="absolute right-3 bottom-8 z-[1000] inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-4 font-semibold text-stone-900 shadow-[0_2px_8px_rgb(0_0_0/0.3)]"
        onClick={() =>
          navigator.geolocation.getCurrentPosition(
            (p) => {
              const ll: [number, number] = [p.coords.latitude, p.coords.longitude];
              setPos(ll);
              map.setView(ll, 18);
            },
            () => alert("No se pudo obtener tu ubicación"),
            { enableHighAccuracy: true, timeout: 15000 },
          )
        }
      >
        <LocateFixed className="size-5 text-postigo-700" aria-hidden />
        Dónde estoy
      </button>
      {pos && <CircleMarker center={pos} radius={8} pathOptions={{ color: "#fff", fillColor: AGUA, fillOpacity: 1, weight: 3 }} />}
    </>
  );
}

export default function MapaUsuarios({
  puntos,
  sectores,
  proyectos = [],
}: {
  puntos: PuntoVivienda[];
  sectores: { id: number; nombre: string; color: string | null }[];
  proyectos?: { id: string; nombre: string }[];
}) {
  const [ayuda, setAyuda] = useState("");
  const [sector, setSector] = useState("");
  const [acueducto, setAcueducto] = useState("");
  const [colorPor, setColorPor] = useState<"acueducto" | "sector">("acueducto");
  const [q, setQ] = useState("");

  const colorSector = useMemo(
    () => new Map(sectores.map((s, i) => [s.id, s.color ?? COLORES[i % COLORES.length]])),
    [sectores],
  );

  const visibles = puntos.filter(
    (p) =>
      (!sector || String(p.sectorId) === sector) &&
      (!acueducto || String(p.usaAcueducto) === acueducto) &&
      (!ayuda || (ayuda === "ninguna" ? !p.proyectos.length : p.proyectos.includes(ayuda))) &&
      (!q ||
        p.codigo?.toLowerCase().includes(q.toLowerCase()) ||
        p.jefe?.toLowerCase().includes(q.toLowerCase())),
  );

  const color = (p: PuntoVivienda) =>
    colorPor === "sector"
      ? (p.sectorId && colorSector.get(p.sectorId)) || "#8f978f"
      : p.usaAcueducto
        ? AGUA
        : SIN_AGUA;

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-stone-200 bg-white px-3 py-2.5">
        <div className="flex items-center gap-2">
          <input
            className="input min-h-11 flex-1"
            type="search"
            aria-label="Buscar"
            placeholder="Buscar nombre o código"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className="shrink-0 px-1 text-stone-700" role="status">
            <span className="num font-bold">{visibles.length}</span> casas
          </span>
        </div>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-0.5">
          <select className="input min-h-10 w-auto shrink-0 py-1.5 text-[0.95rem]" aria-label="Sector" value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">Todos los sectores</option>
            {sectores.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
          <select className="input min-h-10 w-auto shrink-0 py-1.5 text-[0.95rem]" aria-label="Acueducto" value={acueducto} onChange={(e) => setAcueducto(e.target.value)}>
            <option value="">Con y sin acueducto</option>
            <option value="true">Con acueducto</option>
            <option value="false">Sin acueducto</option>
          </select>
          {proyectos.length > 0 && (
            <select className="input min-h-10 w-auto shrink-0 py-1.5 text-[0.95rem]" aria-label="Ayuda recibida" value={ayuda} onChange={(e) => setAyuda(e.target.value)}>
              <option value="">Cualquier ayuda</option>
              <option value="ninguna">No han recibido ayudas</option>
              {proyectos.map((pr) => (
                <option key={pr.id} value={pr.id}>Recibió: {pr.nombre}</option>
              ))}
            </select>
          )}
          <select className="input min-h-10 w-auto shrink-0 py-1.5 text-[0.95rem]" aria-label="Colorear por" value={colorPor} onChange={(e) => setColorPor(e.target.value as "acueducto" | "sector")}>
            <option value="acueducto">Colores: acueducto</option>
            <option value="sector">Colores: sector</option>
          </select>
        </div>
      </div>
      <div className="relative flex-1">
        <MapContainer center={CENTRO_MUNICIPIO} zoom={14} className="absolute inset-0" preferCanvas>
          <CapasBase />
          <Encuadrar puntos={puntos} />
          <MiUbicacion />
          {visibles.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={9}
              pathOptions={{ color: "#fff", weight: 2.5, fillColor: color(p), fillOpacity: p.estado === "habitada" ? 0.95 : 0.4 }}
            >
              <Popup>
                <div className="min-w-44 space-y-1 text-[0.95rem]">
                  <div className="text-base font-bold text-stone-900">{p.jefe ?? "Sin familia registrada"}</div>
                  <div className="num text-stone-600">{p.codigo}</div>
                  <div className="text-stone-700">
                    <span className="num">{p.personas}</span> persona(s) · {p.usaAcueducto ? "Con acueducto" : "Sin acueducto"}
                  </div>
                  {p.referencia && <div className="text-stone-600">{p.referencia}</div>}
                  <Link href={`/viviendas/${p.id}`} className="inline-block pt-1 font-bold text-marca-700 underline">Ver ficha</Link>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
        <div className="absolute bottom-8 left-3 z-[1000] space-y-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold shadow-[0_2px_8px_rgb(0_0_0/0.3)]">
          {colorPor === "acueducto" ? (
            <>
              <div><span className="mr-1.5 inline-block size-3.5 rounded-full align-middle" style={{ background: AGUA }} />Con acueducto</div>
              <div><span className="mr-1.5 inline-block size-3.5 rounded-full align-middle" style={{ background: SIN_AGUA }} />Sin acueducto</div>
            </>
          ) : (
            sectores.map((s) => (
              <div key={s.id}>
                <span className="mr-1.5 inline-block size-3.5 rounded-full align-middle" style={{ background: colorSector.get(s.id) }} />
                {s.nombre}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
