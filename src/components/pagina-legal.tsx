import Link from "next/link";

/** Marco común de las páginas legales públicas. */
export function PaginaLegal({ titulo, version, vigencia, children }: { titulo: string; version: string; vigencia: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="bg-marca-800 px-4 pt-6 pb-8 text-marca-50 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="font-semibold text-marca-100">JAC Arango · Concepción, Antioquia</p>
          <h1 className="mt-2 text-[2rem] leading-tight font-bold text-white">{titulo}</h1>
          <p className="mt-2 text-marca-100">
            Versión {version} · vigente desde el {vigencia}
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <article className="legal space-y-4 text-[1.02rem] leading-relaxed text-stone-800">{children}</article>
        <nav className="mt-10 flex flex-wrap gap-4 border-t border-stone-200 pt-5 font-semibold text-marca-700">
          <Link href="/privacidad" className="underline">Política de datos personales</Link>
          <Link href="/terminos" className="underline">Términos de uso</Link>
          <Link href="/transparencia" className="underline">Cuentas claras</Link>
          <Link href="/login" className="underline">Ingresar</Link>
        </nav>
      </main>
    </div>
  );
}
