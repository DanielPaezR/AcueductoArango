"use client";

import { FileText, Plus, X } from "lucide-react";
import { comprimirImagen } from "@/lib/offline/sync";

export type FotoNueva = { id: string; blob: Blob; url: string; nombre?: string; pdf?: boolean };

/** Elegir o tomar fotos (y, si se permite, PDF) antes de subirlas. Las fotos se comprimen en el teléfono. */
export function FotosPicker({
  fotos,
  onChange,
  etiqueta = "Foto",
  pdf = false,
  ancho = 2000,
}: {
  fotos: FotoNueva[];
  onChange: (f: FotoNueva[]) => void;
  etiqueta?: string;
  pdf?: boolean;
  ancho?: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {fotos.map((f) => (
        <div key={f.id} className="relative">
          {f.pdf ? (
            <div className="flex size-24 flex-col items-center justify-center gap-1 rounded-lg bg-stone-100 p-1 text-center text-xs text-stone-700">
              <FileText className="size-7 text-teja-700" aria-hidden />
              <span className="line-clamp-2 break-all">{f.nombre}</span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.url} alt="" className="size-24 rounded-lg object-cover" />
          )}
          <button
            type="button"
            className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-teja-600 text-white shadow"
            aria-label="Quitar"
            onClick={() => onChange(fotos.filter((x) => x.id !== f.id))}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
      <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-stone-300 text-center text-sm font-semibold text-stone-600 hover:border-marca-600 hover:text-marca-700">
        <Plus className="size-6" aria-hidden />
        {etiqueta}
        <input
          type="file"
          accept={pdf ? "image/*,application/pdf" : "image/*"}
          capture={pdf ? undefined : "environment"}
          multiple
          className="hidden"
          onChange={async (e) => {
            const nuevas = await Promise.all(
              Array.from(e.target.files ?? []).map(async (f) => {
                const esPdf = f.type === "application/pdf";
                const blob = esPdf ? f : await comprimirImagen(f, ancho, 0.85);
                return { id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob), nombre: esPdf ? f.name : undefined, pdf: esPdf };
              }),
            );
            onChange([...fotos, ...nuevas]);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

/** Galería de adjuntos ya subidos. */
export function Galeria({ adjuntos }: { adjuntos: { id: string; url: string; tipo?: string }[] }) {
  if (!adjuntos.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {adjuntos.map((a) =>
        /\.pdf($|\?)/i.test(a.url) ? (
          <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="flex size-28 flex-col items-center justify-center gap-1 rounded-lg bg-stone-100 text-sm font-semibold text-stone-700 hover:bg-stone-200">
            <FileText className="size-8 text-teja-700" aria-hidden />
            Abrir PDF
          </a>
        ) : (
          <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.url} alt="Adjunto" className="size-28 rounded-lg object-cover ring-1 ring-stone-200" />
          </a>
        ),
      )}
    </div>
  );
}
