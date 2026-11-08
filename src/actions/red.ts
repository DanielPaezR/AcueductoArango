"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { auditar } from "@/lib/auditoria";
import { requerirPermiso } from "@/lib/session";

export async function eliminarElemento(id: string) {
  const u = await requerirPermiso("acueducto_red", "eliminar");
  await db.update(schema.elementosAcueducto).set({ deletedAt: new Date() }).where(eq(schema.elementosAcueducto.id, id));
  await auditar(u.id, "eliminar", "elemento", id);
  revalidatePath("/acueducto");
  redirect("/acueducto");
}

export async function eliminarTramo(id: string) {
  const u = await requerirPermiso("acueducto_red", "eliminar");
  await db.update(schema.tramosAcueducto).set({ deletedAt: new Date() }).where(eq(schema.tramosAcueducto.id, id));
  await auditar(u.id, "eliminar", "tramo", id);
  revalidatePath("/acueducto");
  redirect("/acueducto");
}

/**
 * Envía la factura de un arreglo a tesorería como gasto "por aprobar", con las mismas fotos de soporte.
 * El concepto no lleva nombres de personas porque se publica.
 */
export async function pasarATesoreria(compraId: string, cuentaId: number) {
  const { ROLES } = await import("@/lib/permisos");
  const u = await requerirPermiso("tesoreria", "crear");
  const c = await db.query.compras.findFirst({ where: eq(schema.compras.id, compraId) });
  if (!c) throw new Error("La compra no existe");
  if (c.movimientoId) throw new Error("Este gasto ya se envió a tesorería");
  const cuenta = await db.query.cuentas.findFirst({ where: eq(schema.cuentas.id, cuentaId) });
  if (!cuenta || !cuenta.activa || cuenta.fondo !== "acueducto") throw new Error("Los gastos del acueducto van a una cuenta del acueducto");
  const m = c.mantenimientoId ? await db.query.mantenimientos.findFirst({ where: eq(schema.mantenimientos.id, c.mantenimientoId) }) : null;
  const yo = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.id, u.id), columns: { cargo: true, rol: true } });

  const movId = await db.transaction(async (tx) => {
    const [mov] = await tx
      .insert(schema.movimientos)
      .values({
        cuentaId,
        tipo: "egreso",
        categoria: "Materiales",
        concepto: [`Materiales${m ? ` para: ${m.titulo}` : ""}`, c.proveedor, c.numeroFactura && `factura ${c.numeroFactura}`]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 300),
        valor: c.total,
        fecha: c.fecha,
        registradoPor: u.id,
        cargoRegistro: yo?.cargo || ROLES[(yo?.rol ?? "admin") as keyof typeof ROLES],
      })
      .returning({ id: schema.movimientos.id });
    await tx.update(schema.compras).set({ movimientoId: mov.id }).where(eq(schema.compras.id, compraId));
    // Las fotos de la factura sirven de soporte del movimiento
    const facturas = c.mantenimientoId
      ? await tx.query.adjuntos.findMany({
          where: (a, { and: y, eq: igual }) => y(igual(a.entidad, "mantenimiento"), igual(a.entidadId, c.mantenimientoId!), igual(a.tipo, "factura")),
        })
      : [];
    if (facturas.length)
      await tx.insert(schema.adjuntos).values(
        facturas.map((f) => ({ entidad: "movimiento", entidadId: mov.id, tipo: "soporte", url: f.url, publicId: f.publicId, createdBy: u.id })),
      );
    return mov.id;
  });
  await auditar(u.id, "pasar_a_tesoreria", "compra", compraId, { movimiento: movId });
  revalidatePath("/tesoreria");
  if (c.mantenimientoId) revalidatePath(`/mantenimientos/${c.mantenimientoId}`);
}

export async function eliminarMantenimiento(id: string) {
  const u = await requerirPermiso("mantenimientos", "eliminar");
  await db.update(schema.mantenimientos).set({ deletedAt: new Date() }).where(eq(schema.mantenimientos.id, id));
  await auditar(u.id, "eliminar", "mantenimiento", id);
  revalidatePath("/mantenimientos");
  redirect("/mantenimientos");
}
