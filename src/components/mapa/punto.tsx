"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo } from "react";
import { MapContainer, Marker } from "react-leaflet";
import { CapasBase } from "./capas";
import { iconoCasa } from "./selector";

/** Mapa pequeño de solo lectura con un punto (por defecto, una casa). */
export default function MapaPunto({ lat, lng, iconoHtml, alfiler = false }: { lat: number; lng: number; iconoHtml?: string; alfiler?: boolean }) {
  const icono = useMemo(
    () =>
      iconoHtml
        ? L.divIcon({ className: "", html: iconoHtml, iconSize: alfiler ? [30, 38] : [30, 30], iconAnchor: alfiler ? [15, 36] : [15, 15] })
        : iconoCasa,
    [iconoHtml, alfiler],
  );
  return (
    <MapContainer center={[lat, lng]} zoom={18} className="h-64 w-full rounded-lg" scrollWheelZoom={false}>
      <CapasBase />
      <Marker position={[lat, lng]} icon={icono} />
    </MapContainer>
  );
}
