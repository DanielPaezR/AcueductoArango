import { CircleAlert } from "lucide-react";
import Link from "next/link";

/** Cifra destacada con su etiqueta (y un detalle opcional). */
export function Cifra({ titulo, valor, detalle, href }: { titulo: string; valor: string | number; detalle?: string; href?: string }) {
  const cuerpo = (
    <>
      <dt className="text-sm text-stone-600">{titulo}</dt>
      <dd className="num text-[1.7rem] leading-tight font-bold text-stone-900">{typeof valor === "number" ? valor.toLocaleString("es-CO") : valor}</dd>
      {detalle && <dd className="text-sm text-stone-600">{detalle}</dd>}
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-lg p-1 -m-1 hover:bg-stone-50">
      {cuerpo}
    </Link>
  ) : (
    <div>{cuerpo}</div>
  );
}

/**
 * Barras horizontales de una sola serie (magnitud): un solo tono, extremo redondeado, valor al lado en tinta de texto.
 * `title` en cada fila hace de ayuda emergente con el dato exacto.
 */
export function Barras({
  filas,
  maximo,
  formato = (n) => n.toLocaleString("es-CO"),
}: {
  filas: { etiqueta: string; valor: number; detalle?: string; href?: string }[];
  maximo?: number;
  formato?: (n: number) => string;
}) {
  const max = Math.max(1, maximo ?? Math.max(...filas.map((f) => f.valor), 0));
  return (
    <ul className="space-y-2.5">
      {filas.map((f) => {
        const contenido = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-[0.95rem]">
              <span className="min-w-0 truncate font-semibold">{f.etiqueta}</span>
              <span className="num shrink-0 text-stone-800">
                <strong>{formato(f.valor)}</strong>
                {f.detalle && <span className="text-stone-600"> {f.detalle}</span>}
              </span>
            </div>
            <div className="mt-1 h-2.5 rounded-full bg-stone-100" aria-hidden>
              <div className="h-2.5 rounded-full bg-marca-600" style={{ width: `${Math.min(100, (f.valor / max) * 100)}%` }} />
            </div>
          </>
        );
        return (
          <li key={f.etiqueta} title={`${f.etiqueta}: ${formato(f.valor)}${f.detalle ? ` ${f.detalle}` : ""}`}>
            {f.href ? (
              <Link href={f.href} className="block rounded hover:bg-stone-50">
                {contenido}
              </Link>
            ) : (
              contenido
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Aviso de estado: siempre con ícono y texto, nunca solo color. */
export function Alerta({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-ocre-800">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

export const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
