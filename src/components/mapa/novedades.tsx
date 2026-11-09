"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, useMap } from "react-leaflet";
import { svgNovedad } from "@/lib/novedades";
import { CATEGORIAS_NOVEDAD, CENTRO_MUNICIPIO, ESTADOS_NOVEDAD, type CategoriaNovedad, type EstadoNovedad } from "@/lib/opciones";
import { CapasBase } from "./capas";

export type PuntoNovedad = { id: string; titulo: string; categoria: string; estado: string; lat: number; lng: number };

const icono = (n: PuntoNovedad) => L.divIcon({ className: "", html: svgNovedad(n.categoria, n.estado, 30), iconSize: [30, 38], iconAnchor: [15, 36], popupAnchor: [0, -32] });

function Encuadrar({ puntos }: { puntos: PuntoNovedad[] }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length) map.fitBounds(L.latLngBounds(puntos.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 17 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Marcadores de novedades para usar dentro de cualquier mapa. */
export function MarcadoresNovedad({ puntos }: { puntos: PuntoNovedad[] }) {
  return (
    <>
      {puntos.map((n) => (
        <Marker key={n.id} position={[n.lat, n.lng]} icon={icono(n)}>
          <Popup>
            <div className="space-y-1 text-[0.95rem]">
              <p className="font-bold">{n.titulo}</p>
              <p className="text-stone-600">
                {CATEGORIAS_NOVEDAD[n.categoria as CategoriaNovedad]?.label} · {ESTADOS_NOVEDAD[n.estado as EstadoNovedad]?.label}
              </p>
              <Link href={`/novedades/${n.id}`} className="font-semibold text-marca-700 underline">
                Ver detalle
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export default function MapaNovedades({ puntos }: { puntos: PuntoNovedad[] }) {
  return (
    <MapContainer center={CENTRO_MUNICIPIO} zoom={14} className="h-full w-full" scrollWheelZoom>
      <CapasBase />
      <Encuadrar puntos={puntos} />
      <MarcadoresNovedad puntos={puntos} />
    </MapContainer>
  );
}
