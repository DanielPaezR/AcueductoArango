"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
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
};

const COLORES = ["#f97316", "#a855f7", "#eab308", "#ec4899", "#14b8a6", "#ef4444", "#84cc16", "#6366f1"];

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
        className="absolute bottom-6 right-3 z-[1000] rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-lg"
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
        📍 Dónde estoy
      </button>
      {pos && <CircleMarker center={pos} radius={8} pathOptions={{ color: "#fff", fillColor: "#2563eb", fillOpacity: 1, weight: 3 }} />}
    </>
  );
}

export default function MapaUsuarios({
  puntos,
  sectores,
}: {
  puntos: PuntoVivienda[];
  sectores: { id: number; nombre: string; color: string | null }[];
}) {
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
      (!q ||
        p.codigo?.toLowerCase().includes(q.toLowerCase()) ||
        p.jefe?.toLowerCase().includes(q.toLowerCase())),
  );

  const color = (p: PuntoVivienda) =>
    colorPor === "sector"
      ? (p.sectorId && colorSector.get(p.sectorId)) || "#9ca3af"
      : p.usaAcueducto
        ? "#0ea5e9"
        : "#f59e0b";

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-2 border-b border-stone-200 bg-white p-2 text-sm">
        <input className="input max-w-48 py-1" placeholder="Buscar código o nombre" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-auto py-1" value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="">Todos los sectores</option>
          {sectores.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
        <select className="input w-auto py-1" value={acueducto} onChange={(e) => setAcueducto(e.target.value)}>
          <option value="">Con y sin acueducto</option>
          <option value="true">Usan acueducto</option>
          <option value="false">No usan acueducto</option>
        </select>
        <select className="input w-auto py-1" value={colorPor} onChange={(e) => setColorPor(e.target.value as "acueducto" | "sector")}>
          <option value="acueducto">Color: acueducto</option>
          <option value="sector">Color: sector</option>
        </select>
        <span className="self-center text-stone-500">{visibles.length} viviendas</span>
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
              radius={8}
              pathOptions={{ color: "#fff", weight: 2, fillColor: color(p), fillOpacity: p.estado === "habitada" ? 0.95 : 0.4 }}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <div className="font-bold">{p.codigo}</div>
                  <div>{p.jefe ?? "Sin jefe de hogar registrado"}</div>
                  <div className="text-stone-500">
                    {p.personas} persona(s) · {p.usaAcueducto ? "💧 Usa acueducto" : "Sin acueducto"}
                  </div>
                  {p.referencia && <div className="text-xs text-stone-500">{p.referencia}</div>}
                  <Link href={`/viviendas/${p.id}`} className="font-semibold text-marca-700">Ver ficha →</Link>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
        <div className="absolute bottom-6 left-3 z-[1000] rounded-lg bg-white/95 p-2 text-xs shadow">
          {colorPor === "acueducto" ? (
            <>
              <div><span className="mr-1 inline-block h-3 w-3 rounded-full bg-sky-500 align-middle" />Usa acueducto</div>
              <div><span className="mr-1 inline-block h-3 w-3 rounded-full bg-amber-500 align-middle" />No usa</div>
            </>
          ) : (
            sectores.map((s) => (
              <div key={s.id}>
                <span className="mr-1 inline-block h-3 w-3 rounded-full align-middle" style={{ background: colorSector.get(s.id) }} />
                {s.nombre}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
