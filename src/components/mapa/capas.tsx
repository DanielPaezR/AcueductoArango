"use client";

import { LayersControl, TileLayer } from "react-leaflet";

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
