import { and, eq, isNull } from "drizzle-orm";
import { ChevronLeft, MapPin, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eliminarMantenimiento } from "@/actions/red";
import { BotonEliminar } from "@/components/boton-eliminar";
import { Galeria } from "@/components/historial-arreglos";
import { db, schema } from "@/db";
import { adjuntosDe } from "@/lib/consultas-red";
import { fechaCorta, pesos } from "@/lib/dinero";
import { cuentasConSaldo } from "@/lib/finanzas";
import { puede } from "@/lib/permisos";
import { ESTADOS_MANTENIMIENTO, PRIORIDADES, TIPOS_ELEMENTO, TIPOS_MANTENIMIENTO, TIPOS_TRAMO } from "@/lib/red";
import { requerirPermiso } from "@/lib/session";
import { PasarATesoreria } from "./pasar";

export const metadata = { title: "Arreglo" };

export default async function Mantenimiento({ params }: PageProps<"/mantenimientos/[id]">) {
  const u = await requerirPermiso("mantenimientos", "ver");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const m = await db.query.mantenimientos.findFirst({ where: and(eq(schema.mantenimientos.id, id), isNull(schema.mantenimientos.deletedAt)) });
  if (!m) notFound();
  const [materiales, compra, fotos, elemento, tramo, vivienda, responsable] = await Promise.all([
    db.select().from(schema.materialesUsados).where(eq(schema.materialesUsados.mantenimientoId, id)),
    db.query.compras.findFirst({ where: eq(schema.compras.mantenimientoId, id) }),
    adjuntosDe("mantenimiento", id),
    m.elementoId ? db.query.elementosAcueducto.findFirst({ where: eq(schema.elementosAcueducto.id, m.elementoId) }) : null,
    m.tramoId ? db.query.tramosAcueducto.findFirst({ where: eq(schema.tramosAcueducto.id, m.tramoId) }) : null,
    m.viviendaId ? db.query.viviendas.findFirst({ where: eq(schema.viviendas.id, m.viviendaId), columns: { id: true, codigo: true } }) : null,
    m.responsableId ? db.query.usuarios.findFirst({ where: eq(schema.usuarios.id, m.responsableId), columns: { nombre: true, cargo: true } }) : null,
  ]);
  const totalMat = materiales.reduce((a, x) => a + Number(x.cantidad) * Number(x.valorUnitario ?? 0), 0);
  const total = totalMat + Number(m.costoManoObra);
  const puedeTesoreria = puede(u, "tesoreria", "crear");
  const cuentas = compra && !compra.movimientoId && puedeTesoreria ? await cuentasConSaldo(true, "acueducto") : [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/mantenimientos" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Mantenimientos
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-stone-600">{TIPOS_MANTENIMIENTO[m.tipo as keyof typeof TIPOS_MANTENIMIENTO]}</p>
          <h1 className="text-[1.75rem] leading-tight font-bold">{m.titulo}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`chip ${m.estado === "terminado" ? "bg-postigo-50 text-postigo-800" : m.estado === "reportado" ? "bg-teja-50 text-teja-700" : "bg-ocre-50 text-ocre-800"}`}>
              {ESTADOS_MANTENIMIENTO[m.estado as keyof typeof ESTADOS_MANTENIMIENTO]}
            </span>
            <span className="chip bg-stone-200 text-stone-800">Prioridad {PRIORIDADES[m.prioridad as keyof typeof PRIORIDADES].toLowerCase()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {puede(u, "mantenimientos", "editar") && (
            <Link href={`/mantenimientos/${id}/editar`} className="btn-primario">
              <Pencil className="size-5" aria-hidden />
              Editar
            </Link>
          )}
          {puede(u, "mantenimientos", "eliminar") && <BotonEliminar accion={eliminarMantenimiento.bind(null, id)} pregunta="¿Eliminar este registro?" />}
        </div>
      </header>

      <section className="tarjeta space-y-3">
        {m.descripcion && <p className="text-[1.05rem] text-stone-800">{m.descripcion}</p>}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {elemento && (
            <div>
              <dt className="text-sm text-stone-600">Punto de la red</dt>
              <dd>
                <Link href={`/acueducto/punto/${elemento.id}`} className="font-semibold text-marca-700 underline">
                  {elemento.nombre ?? TIPOS_ELEMENTO[elemento.tipo as keyof typeof TIPOS_ELEMENTO]?.label}
                </Link>
              </dd>
            </div>
          )}
          {tramo && (
            <div>
              <dt className="text-sm text-stone-600">Tubería</dt>
              <dd>
                <Link href={`/acueducto/tramo/${tramo.id}`} className="font-semibold text-marca-700 underline">
                  {tramo.nombre ?? TIPOS_TRAMO[tramo.tipo as keyof typeof TIPOS_TRAMO]?.corto}
                </Link>
              </dd>
            </div>
          )}
          {vivienda && (
            <div>
              <dt className="text-sm text-stone-600">Casa</dt>
              <dd>
                <Link href={`/viviendas/${vivienda.id}`} className="num font-semibold text-marca-700 underline">{vivienda.codigo}</Link>
              </dd>
            </div>
          )}
          {m.lat != null && m.lng != null && (
            <div>
              <dt className="text-sm text-stone-600">Ubicación</dt>
              <dd>
                <a className="inline-flex items-center gap-1 font-semibold text-marca-700 underline" href={`https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}`} target="_blank" rel="noreferrer">
                  <MapPin className="size-4" aria-hidden />
                  Cómo llegar
                </a>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-stone-600">Reportado</dt>
            <dd className="num font-semibold">{fechaCorta(m.fechaReporte) || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-stone-600">Arreglado</dt>
            <dd className="num font-semibold">{fechaCorta(m.fechaEjecucion) || "—"}</dd>
          </div>
          {responsable && (
            <div>
              <dt className="text-sm text-stone-600">Registró</dt>
              <dd className="font-semibold">{responsable.nombre}{responsable.cargo ? ` (${responsable.cargo})` : ""}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="tarjeta" aria-labelledby="costos">
        <h2 id="costos" className="mb-3 text-lg font-bold">Materiales y costos</h2>
        {materiales.length > 0 && (
          <ul className="divide-y divide-stone-200">
            {materiales.map((x) => (
              <li key={x.id} className="flex items-baseline justify-between gap-3 py-2">
                <span>
                  <span className="num">{Number(x.cantidad)}</span> {x.unidad} · {x.descripcion}
                </span>
                {x.valorUnitario && <span className="num font-semibold">{pesos(Number(x.cantidad) * Number(x.valorUnitario))}</span>}
              </li>
            ))}
          </ul>
        )}
        <dl className="mt-2 space-y-1 border-t border-stone-200 pt-3">
          <div className="flex justify-between">
            <dt className="text-stone-700">Materiales</dt>
            <dd className="num font-semibold">{pesos(totalMat)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-700">Mano de obra</dt>
            <dd className="num font-semibold">{pesos(m.costoManoObra)}</dd>
          </div>
          <div className="flex justify-between text-lg">
            <dt className="font-bold">Total</dt>
            <dd className="num font-bold">{pesos(total)}</dd>
          </div>
        </dl>
      </section>

      {compra && (
        <section className="tarjeta" aria-labelledby="factura">
          <h2 id="factura" className="mb-1 text-lg font-bold">Factura de compra</h2>
          <p className="text-stone-700">
            {[compra.proveedor, compra.numeroFactura && `N.º ${compra.numeroFactura}`, fechaCorta(compra.fecha)].filter(Boolean).join(" · ")} ·{" "}
            <strong className="num">{pesos(compra.total)}</strong>
          </p>
          {compra.movimientoId ? (
            <p className="mt-2 font-semibold text-postigo-700">Ya se envió a tesorería.</p>
          ) : puedeTesoreria && cuentas.length ? (
            <PasarATesoreria compraId={compra.id} cuentas={cuentas.map((c) => ({ id: c.id, nombre: c.nombre }))} />
          ) : (
            <p className="mt-2 text-stone-600">Pendiente de registrar en tesorería.</p>
          )}
        </section>
      )}

      <Galeria fotos={fotos} titulo="Fotos del arreglo" />
    </div>
  );
}
