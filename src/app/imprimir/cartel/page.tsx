import { qrSvg, urlPublica } from "@/lib/url-publica";
import { requerirUsuario } from "@/lib/session";

export const metadata = { title: "Cartel de la página pública" };

/** Cartel tamaño carta para pegar en la tienda, la escuela o la caseta comunal. */
export default async function Cartel() {
  await requerirUsuario();
  const url = await urlPublica();
  const svg = await qrSvg(url);
  return (
    <article className="flex min-h-[90vh] flex-col items-center justify-center gap-6 rounded-xl border-4 border-marca-800 p-8 text-center print:min-h-[95vh] print:rounded-none">
      <p className="text-xl font-bold text-marca-800">JAC Arango · Acueducto veredal</p>
      <h1 className="text-[2.6rem] leading-tight font-bold">Cuentas claras del acueducto</h1>
      <p className="max-w-xl text-xl text-stone-800">
        Escanee este código con la cámara del celular para ver cuánta plata hay, en qué se gasta y consultar su estado de cuenta con su cédula.
      </p>
      <div className="size-72 sm:size-80 [&_svg]:size-full" role="img" aria-label={`Código QR de ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="num text-lg font-semibold break-all text-stone-800">{url}</p>
      <p className="text-stone-700">Junta de Acción Comunal · Vereda Arango · Concepción, Antioquia</p>
    </article>
  );
}
