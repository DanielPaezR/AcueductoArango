import { ChevronRight, Wrench } from "lucide-react";
import Link from "next/link";
import { fechaCorta } from "@/lib/dinero";
import { miniatura } from "@/lib/imagenes";
import { ESTADOS_MANTENIMIENTO, TIPOS_MANTENIMIENTO } from "@/lib/red";

const ZOCALO: Record<string, string> = {
  reportado: "zocalo-alerta",
  en_proceso: "zocalo-pendiente",
  terminado: "zocalo-agua",
  cancelado: "zocalo-muro",
};

export function HistorialArreglos({
  items,
  nuevoHref,
}: {
  items: { id: string; titulo: string; tipo: string; estado: string; fechaReporte: string | null; fechaEjecucion: string | null }[];
  nuevoHref?: string;
}) {
  return (
    <section aria-labelledby="arreglos">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="arreglos" className="text-lg font-bold">Arreglos y mantenimientos</h2>
        {nuevoHref && (
          <Link href={nuevoHref} className="btn-secundario min-h-11">
            <Wrench className="size-5" aria-hidden />
            Registrar arreglo
          </Link>
        )}
      </div>
      {items.length ? (
        <ul className="space-y-2.5">
          {items.map((m) => (
            <li key={m.id}>
              <Link href={`/mantenimientos/${m.id}`} className={`zocalo ${ZOCALO[m.estado]} flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 pb-5 hover:border-stone-300`}>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{m.titulo}</div>
                  <div className="text-sm text-stone-600">
                    {TIPOS_MANTENIMIENTO[m.tipo as keyof typeof TIPOS_MANTENIMIENTO]} · {ESTADOS_MANTENIMIENTO[m.estado as keyof typeof ESTADOS_MANTENIMIENTO]} ·{" "}
                    <span className="num">{fechaCorta(m.fechaEjecucion ?? m.fechaReporte)}</span>
                  </div>
                </div>
                <ChevronRight className="size-5 text-stone-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="tarjeta text-stone-600">Sin arreglos registrados.</div>
      )}
    </section>
  );
}

export function Galeria({ fotos, titulo = "Fotos" }: { fotos: { id: string; url: string; tipo: string; descripcion: string | null }[]; titulo?: string }) {
  if (!fotos.length) return null;
  const ETIQUETA: Record<string, string> = { antes: "Antes", despues: "Después", factura: "Factura", soporte: "Soporte" };
  return (
    <section className="tarjeta" aria-label={titulo}>
      <h2 className="mb-3 text-lg font-bold">{titulo}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {fotos.map((a) => (
          <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="relative block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={miniatura(a.url)!} alt={a.descripcion ?? titulo} className="aspect-[4/3] w-full rounded-lg object-cover" />
            {ETIQUETA[a.tipo] && <span className="chip absolute top-2 left-2 bg-white/95 text-stone-900 shadow">{ETIQUETA[a.tipo]}</span>}
          </a>
        ))}
      </div>
    </section>
  );
}
