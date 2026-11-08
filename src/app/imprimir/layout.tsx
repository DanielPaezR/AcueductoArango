import { BotonImprimir, BotonVolver } from "./boton";

/** Páginas para imprimir o guardar como PDF: sin menú de la app, en blanco y negro legible. */
export default function LayoutImprimir({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh bg-white text-stone-900">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 print:hidden">
        <BotonVolver />
        <BotonImprimir />
      </div>
      <div className="mx-auto max-w-[48rem] p-4 print:max-w-none print:p-0">{children}</div>
    </div>
  );
}
