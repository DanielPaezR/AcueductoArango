"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { Circle, MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import { CENTRO_MUNICIPIO } from "@/lib/opciones";
import { CapasBase } from "./capas";

export const iconoCasa = L.divIcon({
  className: "",
  html: '<div style="font-size:30px;line-height:30px;transform:translate(-4px,-26px);filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">🏠</div>',
  iconSize: [24, 24],
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
          {precision ? <Circle center={pos} radius={precision} pathOptions={{ color: "#38bdf8", weight: 1 }} /> : null}
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
