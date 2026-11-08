"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, Marker } from "react-leaflet";
import { CapasBase } from "./capas";
import { iconoCasa } from "./selector";

/** Mapa pequeño de solo lectura con un punto. */
export default function MapaPunto({ lat, lng }: { lat: number; lng: number }) {
  return (
    <MapContainer center={[lat, lng]} zoom={18} className="h-64 w-full rounded-lg" scrollWheelZoom={false}>
      <CapasBase />
      <Marker position={[lat, lng]} icon={iconoCasa} />
    </MapContainer>
  );
}
