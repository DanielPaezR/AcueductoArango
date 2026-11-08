import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { fechaCorta, MEDIO_LABEL, pesos } from "@/lib/dinero";
import { estadoSuscriptores } from "@/lib/finanzas";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Recibo de pago" };

export default async function Recibo({ params }: PageProps<"/imprimir/recibo/[id]">) {
  await requerirPermiso("facturacion", "ver");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const pago = await db.query.pagos.findFirst({ where: eq(schema.pagos.id, id) });
  if (!pago) notFound();
  const [[e], quien, cuenta] = await Promise.all([
    estadoSuscriptores({ id: pago.suscriptorId }),
    pago.createdBy ? db.query.usuarios.findFirst({ where: eq(schema.usuarios.id, pago.createdBy), columns: { nombre: true, cargo: true } }) : null,
    pago.cuentaId ? db.query.cuentas.findFirst({ where: eq(schema.cuentas.id, pago.cuentaId) }) : null,
  ]);

  return (
    <article className="rounded-xl border-2 border-stone-800 p-6 print:rounded-none">
      <header className="flex items-start justify-between gap-4 border-b-2 border-stone-800 pb-4">
        <div>
          <p className="text-lg font-bold">JAC Arango · Acueducto veredal</p>
          <p className="text-stone-700">Vereda Arango · Concepción, Antioquia</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-stone-600">Recibo de pago</p>
          <p className="num text-2xl font-bold">N.º {pago.numeroRecibo}</p>
        </div>
      </header>
      {pago.anulado && (
        <p className="mt-4 border-2 border-teja-700 p-2 text-center text-xl font-bold text-teja-700">ANULADO: {pago.motivoAnulacion}</p>
      )}
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <dt className="text-sm text-stone-600">Recibimos de</dt>
          <dd className="text-lg font-bold">{e?.titularNombre}</dd>
        </div>
        <div>
          <dt className="text-sm text-stone-600">Matrícula</dt>
          <dd className="num text-lg font-bold">{e?.codigo}</dd>
        </div>
        <div>
          <dt className="text-sm text-stone-600">Fecha</dt>
          <dd className="num font-semibold">{fechaCorta(pago.fecha)}</dd>
        </div>
        <div>
          <dt className="text-sm text-stone-600">Medio de pago</dt>
          <dd className="font-semibold">
            {MEDIO_LABEL[pago.medio] ?? pago.medio}
            {pago.referencia ? ` · ${pago.referencia}` : ""}
            {cuenta ? ` · ${cuenta.nombre}` : ""}
          </dd>
        </div>
      </dl>
      <div className="mt-6 flex items-baseline justify-between border-y-2 border-stone-800 py-4">
        <span className="text-lg font-semibold">Valor pagado por servicio de acueducto</span>
        <span className="num text-3xl font-bold">{pesos(pago.valor)}</span>
      </div>
      {e && (
        <p className="mt-4 text-lg">
          Estado después de este pago:{" "}
          <strong>{e.alDia ? "al día" : `debe ${pesos(e.deudaVencida)} vencidos (${e.mesesAtraso} mes${e.mesesAtraso === 1 ? "" : "es"})`}</strong>
          {e.deuda < 0 && <> · saldo a favor {pesos(-e.deuda)}</>}
        </p>
      )}
      <footer className="mt-12 grid grid-cols-2 gap-8">
        <div className="border-t border-stone-800 pt-2 text-center text-sm">
          Recibió: {quien?.nombre}
          {quien?.cargo ? ` (${quien.cargo})` : ""}
        </div>
        <div className="border-t border-stone-800 pt-2 text-center text-sm">Firma del usuario</div>
      </footer>
      <p className="mt-6 text-center text-sm text-stone-600">Consulte su estado de cuenta en la página pública del acueducto con su número de cédula.</p>
    </article>
  );
}
