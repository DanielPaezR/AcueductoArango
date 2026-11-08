"use client";

import { Eraser } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Recuadro para firmar con el dedo. Entrega la firma como imagen PNG (Blob), o null si está vacío. */
export function Firma({ onCambio }: { onCambio: (b: Blob | null) => void }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const [vacia, setVacia] = useState(true);

  useEffect(() => {
    const c = lienzo.current!;
    const escala = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * escala;
    c.height = c.offsetHeight * escala;
    const ctx = c.getContext("2d")!;
    ctx.scale(escala, escala);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a201c";
  }, []);

  const punto = (e: React.PointerEvent) => {
    const r = lienzo.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  const terminar = () => {
    if (!dibujando.current) return;
    dibujando.current = false;
    lienzo.current!.toBlob((b) => onCambio(b), "image/png");
  };

  return (
    <div>
      <canvas
        ref={lienzo}
        className="h-40 w-full touch-none rounded-lg border-2 border-dashed border-stone-400 bg-white"
        aria-label="Recuadro para firmar"
        onPointerDown={(e) => {
          dibujando.current = true;
          setVacia(false);
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
          const ctx = lienzo.current!.getContext("2d")!;
          const [x, y] = punto(e);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 0.1, y + 0.1);
          ctx.stroke();
        }}
        onPointerMove={(e) => {
          if (!dibujando.current) return;
          const ctx = lienzo.current!.getContext("2d")!;
          const [x, y] = punto(e);
          ctx.lineTo(x, y);
          ctx.stroke();
        }}
        onPointerUp={terminar}
        onPointerLeave={terminar}
      />
      <div className="mt-1 flex items-center justify-between text-sm text-stone-600">
        <span>{vacia ? "Firme con el dedo dentro del recuadro" : "Firma registrada"}</span>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-1 font-semibold text-stone-700"
          onClick={() => {
            const c = lienzo.current!;
            c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
            setVacia(true);
            onCambio(null);
          }}
        >
          <Eraser className="size-4" aria-hidden />
          Borrar
        </button>
      </div>
    </div>
  );
}
