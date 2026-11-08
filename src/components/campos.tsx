"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* ---------- pequeños componentes de campo ---------- */

export function Campo({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function Select({
  value,
  onChange,
  opciones,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  opciones: readonly string[];
}) {
  return (
    <select className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">—</option>
      {opciones.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export function SiNo({ value, onChange }: { value: boolean | null | undefined; onChange: (v: boolean | null) => void }) {
  return (
    <div className="flex gap-1">
      {([
        [true, "Sí"],
        [false, "No"],
      ] as const).map(([v, l]) => (
        <button
          type="button"
          key={l}
          onClick={() => onChange(value === v ? null : v)}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
            value === v ? "border-marca-700 bg-marca-700 text-white" : "border-stone-300 bg-white text-stone-700"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function Seccion({ titulo, icono: Icono, children }: { titulo: string; icono: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="tarjeta space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900">
        <Icono className="size-5 text-marca-700" aria-hidden />
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/* ---------- GPS ---------- */

export function useGps() {
  const [estado, setEstado] = useState<"inactivo" | "buscando" | "listo" | "error">("inactivo");
  const [lectura, setLectura] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string>();
  const watch = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detener = () => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    if (timer.current) clearTimeout(timer.current);
    watch.current = null;
  };

  /** Escucha el GPS hasta 30 s (o hasta tener ≤ 6 m) y se queda con la lectura más precisa. */
  const iniciar = (onMejor: (p: GeolocationPosition) => void) => {
    if (!("geolocation" in navigator)) {
      setEstado("error");
      setError("Este dispositivo no tiene GPS disponible");
      return;
    }
    detener();
    setEstado("buscando");
    setError(undefined);
    let mejor: GeolocationPosition | null = null;
    watch.current = navigator.geolocation.watchPosition(
      (p) => {
        if (!mejor || p.coords.accuracy < mejor.coords.accuracy) {
          mejor = p;
          setLectura(p);
          onMejor(p);
        }
        if (p.coords.accuracy <= 6) {
          detener();
          setEstado("listo");
        }
      },
      (e) => {
        detener();
        setEstado(mejor ? "listo" : "error");
        setError(e.code === 1 ? "Debe permitir el acceso a la ubicación en el navegador" : "No se pudo obtener la ubicación. Intente al aire libre.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 },
    );
    timer.current = setTimeout(() => {
      detener();
      setEstado(mejor ? "listo" : "error");
      if (!mejor) setError("No se obtuvo señal GPS. Intente al aire libre.");
    }, 30000);
  };

  useEffect(() => detener, []);
  return { estado, lectura, error, iniciar, detener: () => (detener(), setEstado(lectura ? "listo" : "inactivo")) };
}

export function Opciones({
  value,
  onChange,
  opciones,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  opciones: readonly string[];
}) {
  return (
    <div className="flex gap-1">
      {opciones.map((o) => (
        <button
          type="button"
          key={o}
          onClick={() => onChange(value === o ? null : o)}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
            value === o ? "border-marca-700 bg-marca-700 text-white" : "border-stone-300 bg-white text-stone-700"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
