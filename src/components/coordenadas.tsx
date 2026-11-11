"use client";

import { ClipboardPaste, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { kmAlMunicipio, leerNumero, leerPar } from "@/lib/coordenadas";

/**
 * Latitud y longitud editables. Se llenan solas con el GPS o el mapa, y también se pueden escribir
 * o pegar (p. ej. desde Google Maps) para ubicar un sitio sin estar allá.
 */
export function Coordenadas({ pos, onChange }: { pos: [number, number] | null; onChange: (p: [number, number]) => void }) {
  const [lat, setLat] = useState(pos ? pos[0].toFixed(6) : "");
  const [lng, setLng] = useState(pos ? pos[1].toFixed(6) : "");
  const [aviso, setAviso] = useState<string>();

  // Si el GPS o el mapa mueven el punto, mostrar los números nuevos (sin pisar lo que se está escribiendo)
  const [previo, setPrevio] = useState(pos);
  if (pos !== previo && (pos?.[0] !== previo?.[0] || pos?.[1] !== previo?.[1])) {
    setPrevio(pos);
    if (pos && leerNumero(lat) !== pos[0]) setLat(pos[0].toFixed(6));
    if (pos && leerNumero(lng) !== pos[1]) setLng(pos[1].toFixed(6));
  }

  const aplicar = (p: [number, number]) => {
    setLat(String(p[0]));
    setLng(String(p[1]));
    onChange(p);
  };

  const escribir = (campo: "lat" | "lng", t: string) => {
    // Si pegan las dos coordenadas juntas en una casilla, se reparten solas
    const par = leerPar(t);
    if (par) return aplicar(par);
    const nLat = campo === "lat" ? t : lat;
    const nLng = campo === "lng" ? t : lng;
    if (campo === "lat") setLat(t);
    else setLng(t);
    const a = leerNumero(nLat);
    const b = leerNumero(nLng);
    if (a !== null && b !== null && Math.abs(a) <= 90 && Math.abs(b) <= 180) onChange([a, b]);
  };

  const pegar = async () => {
    setAviso(undefined);
    try {
      const par = leerPar(await navigator.clipboard.readText());
      if (par) aplicar(par);
      else setAviso("Lo copiado no parece un par de coordenadas. Ejemplo: 6.39412, -75.26231");
    } catch {
      setAviso("El teléfono no dejó leer lo copiado: mantenga presionada la casilla de Latitud y elija Pegar.");
    }
  };

  const a = leerNumero(lat);
  const b = leerNumero(lng);
  const lejos = a !== null && b !== null && kmAlMunicipio([a, b]) > 30;
  const invalido = (lat && (a === null || Math.abs(a) > 90)) || (lng && (b === null || Math.abs(b) > 180));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-sm font-semibold text-stone-700">Latitud</span>
          <input
            className="input num"
            inputMode="decimal"
            placeholder="6.39412"
            value={lat}
            onChange={(e) => escribir("lat", e.target.value)}
            aria-label="Latitud"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-stone-700">Longitud</span>
          <input
            className="input num"
            inputMode="text"
            placeholder="-75.26231"
            value={lng}
            onChange={(e) => escribir("lng", e.target.value)}
            aria-label="Longitud"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button type="button" className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-marca-700 hover:underline" onClick={pegar}>
          <ClipboardPaste className="size-4" aria-hidden />
          Pegar coordenadas copiadas
        </button>
        <span className="text-sm text-stone-600">Puede escribirlas o pegarlas de Google Maps. En Colombia la longitud lleva el signo menos (−75…).</span>
      </div>
      {invalido && <p className="text-sm text-teja-700" role="alert">Revise los números: deben ser como 6.39412 y -75.26231.</p>}
      {!invalido && lejos && (
        <p className="flex gap-1.5 text-sm text-ocre-800" role="alert">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Ese punto queda a más de 30 km de Concepción. ¿Le faltó el signo menos a la longitud?
        </p>
      )}
      {aviso && <p className="text-sm text-stone-700" role="status">{aviso}</p>}
    </div>
  );
}
