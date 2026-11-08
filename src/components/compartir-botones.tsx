"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

const puedeCompartir = () => typeof navigator !== "undefined" && "share" in navigator;

export function BotonesCompartir({ url, mensaje }: { url: string; mensaje: string }) {
  const [copiado, setCopiado] = useState(false);
  const nativo = useSyncExternalStore(() => () => {}, puedeCompartir, () => false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Navegadores sin portapapeles: seleccionar a mano
      prompt("Copie el enlace:", url);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
        target="_blank"
        rel="noreferrer"
        className="btn text-white"
        style={{ background: "#1f7a4a" }}
      >
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="currentColor">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
        </svg>
        Enviar por WhatsApp
      </a>
      <button type="button" className="btn-secundario" onClick={copiar} aria-live="polite">
        {copiado ? <Check className="size-5 text-marca-700" aria-hidden /> : <Copy className="size-5" aria-hidden />}
        {copiado ? "Enlace copiado" : "Copiar enlace"}
      </button>
      {nativo && (
        <button
          type="button"
          className="btn-secundario sm:col-span-2"
          onClick={() => navigator.share({ title: "Cuentas claras del acueducto", text: mensaje, url }).catch(() => {})}
        >
          <Share2 className="size-5" aria-hidden />
          Compartir por otra aplicación
        </button>
      )}
    </div>
  );
}
