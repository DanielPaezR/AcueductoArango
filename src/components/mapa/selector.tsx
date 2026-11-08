"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { Circle, MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import { CENTRO_MUNICIPIO } from "@/lib/opciones";
import { CapasBase } from "./capas";

/** Marcador de casa: verde balcón con base azul (zócalo), contorno blanco para leer sobre satélite. */
export const iconoCasa = L.divIcon({
  className: "",
  html: `<svg width="36" height="40" viewBox="0 0 36 40" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))">
    <path d="M18 2 3 15h4v15h22V15h4z" fill="#1f5a3a" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="7" y="27" width="22" height="3.5" fill="#1f6698"/>
    <rect x="15" y="19" width="6" height="8" rx="1" fill="#f6f7f4"/>
    <path d="M18 31v7" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,
  iconSize: [36, 40],
  iconAnchor: [18, 38],
});

function Seguir({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.setView(pos, Math.max(map.getZoom(), 18));
  }, [pos, map]);
  return null;
}

function Clic({ onChange }: { onChange: (p: [number, number]) => void }) {
  useMapEvents({ click: (e) => onChange([e.latlng.lat, e.latlng.lng]) });
  return null;
}

/** Mapa para ubicar/ajustar el punto de una casa. Tocar el mapa o arrastrar el marcador lo mueve. */
export default function MapaSelector({
  pos,
  precision,
  onChange,
}: {
  pos: [number, number] | null;
  precision?: number | null;
  onChange: (p: [number, number]) => void;
}) {
  return (
    <MapContainer center={pos ?? CENTRO_MUNICIPIO} zoom={pos ? 18 : 14} className="h-72 w-full rounded-lg" scrollWheelZoom>
      <CapasBase />
      <Seguir pos={pos} />
      <Clic onChange={onChange} />
      {pos && (
        <>
          {precision ? <Circle center={pos} radius={precision} pathOptions={{ color: "#1f6698", weight: 1.5, fillOpacity: 0.12 }} /> : null}
          <Marker
            position={pos}
            icon={iconoCasa}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const ll = (e.target as L.Marker).getLatLng();
                onChange([ll.lat, ll.lng]);
              },
            }}
          />
        </>
      )}
    </MapContainer>
  );
}
