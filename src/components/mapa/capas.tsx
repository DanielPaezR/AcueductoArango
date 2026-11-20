"use client";

import { LayersControl, TileLayer } from "react-leaflet";

/**
 * Capas opcionales con imágenes más recientes que Esri (en Concepción, Esri tiene fotos de 2014 a 2017).
 * Solo aparecen si su variable está configurada en el servidor (se leen al construir la app):
 * - NEXT_PUBLIC_MAPBOX_TOKEN: token público de Mapbox (empieza por "pk."). Mucho detalle; la fecha varía por zona.
 * - NEXT_PUBLIC_SENTINEL_INSTANCIA: id de una configuración de Sentinel Hub en Copernicus Data Space.
 *   Imagen de los últimos meses, con menos detalle (10 m por píxel): se ven vías y terrenos, no casas.
 * Estas teselas no se guardan para verlas sin señal (el service worker solo guarda Esri y OpenStreetMap).
 */
const MAPBOX = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const SENTINEL = process.env.NEXT_PUBLIC_SENTINEL_INSTANCIA;

/** Rango de fechas para Sentinel-2: los últimos 120 días, para tener alguna pasada sin nubes. */
function rangoSentinel() {
  const hoy = new Date();
  const desde = new Date(hoy.getTime() - 120 * 24 * 60 * 60 * 1000);
  const f = (d: Date) => d.toISOString().slice(0, 10);
  return `${f(desde)}/${f(hoy)}`;
}

/** Capas base comunes: satélite (por defecto) con nombres de lugares, y mapa de calles. */
export function CapasBase() {
  return (
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked name="Satélite">
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Imágenes &copy; Esri, Maxar, Earthstar Geographics"
          maxNativeZoom={19}
          maxZoom={21}
        />
      </LayersControl.BaseLayer>
      {MAPBOX && (
        <LayersControl.BaseLayer name="Satélite (Mapbox)">
          <TileLayer
            url={`https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${MAPBOX}`}
            attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; Maxar &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            maxNativeZoom={19}
            maxZoom={21}
          />
        </LayersControl.BaseLayer>
      )}
      {SENTINEL && (
        <LayersControl.BaseLayer name="Satélite reciente (Sentinel-2)">
          <TileLayer
            url={
              `https://sh.dataspace.copernicus.eu/ogc/wmts/${SENTINEL}?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0` +
              `&LAYER=TRUE_COLOR&STYLE=default&FORMAT=image/jpeg&TILEMATRIXSET=PopularWebMercator256` +
              `&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&MAXCC=20&PRIORITY=mostRecent&TIME=${rangoSentinel()}`
            }
            attribution="Contiene datos modificados de Copernicus Sentinel"
            maxNativeZoom={14}
            maxZoom={21}
          />
        </LayersControl.BaseLayer>
      )}
      <LayersControl.BaseLayer name="Calles (OpenStreetMap)">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; colaboradores de OpenStreetMap"
          maxNativeZoom={19}
          maxZoom={21}
        />
      </LayersControl.BaseLayer>
      <LayersControl.Overlay checked name="Nombres y vías">
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          maxNativeZoom={19}
          maxZoom={21}
        />
      </LayersControl.Overlay>
    </LayersControl>
  );
}
