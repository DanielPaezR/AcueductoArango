import { Printer } from "lucide-react";
import Link from "next/link";
import { qrSvg, urlPublica } from "@/lib/url-publica";
import { BotonesCompartir } from "./compartir-botones";

/** Panel para compartir la página pública por WhatsApp, copiar el enlace o mostrar el QR. */
export async function CompartirPublica() {
  const url = await urlPublica();
  const svg = await qrSvg(url);
  const mensaje = `Cuentas claras del acueducto de la vereda Arango: aquí puede ver el saldo, los gastos con sus facturas y consultar su estado de cuenta con su cédula. ${url}`;
  return (
    <section className="tarjeta" aria-labelledby="compartir">
      <h2 id="compartir" className="text-lg font-bold">Compartir la página pública</h2>
      <p className="mt-1 text-stone-700">Envíela al grupo de WhatsApp de la vereda o muestre el código QR para que la abran con la cámara.</p>
      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
        <div
          className="mx-auto size-44 shrink-0 rounded-lg border border-stone-200 bg-white p-2 sm:mx-0 [&_svg]:size-full"
          role="img"
          aria-label={`Código QR de ${url}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="num rounded-lg bg-stone-100 px-3 py-2.5 break-all text-stone-800">{url}</p>
          <BotonesCompartir url={url} mensaje={mensaje} />
          <Link href="/imprimir/cartel" className="btn-secundario w-full">
            <Printer className="size-5" aria-hidden />
            Imprimir cartel con el QR
          </Link>
        </div>
      </div>
    </section>
  );
}
