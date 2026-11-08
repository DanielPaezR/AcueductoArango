import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { usuarioApi } from "@/lib/api";
import { auditar } from "@/lib/auditoria";
import { puede } from "@/lib/permisos";
import { mantenimientoSchema } from "@/lib/validacion";

const { mantenimientos: MT, materialesUsados: MU, compras: CP } = schema;

/** Crea o actualiza un arreglo/mantenimiento con sus materiales y su factura de compra. Idempotente. */
export async function POST(req: Request) {
  const u = await usuarioApi();
  if (u instanceof Response) return u;
  const p = mantenimientoSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: p.error.issues[0].message }, { status: 400 });
  const { materiales, compra, ...m } = p.data;

  const existente = await db.query.mantenimientos.findFirst({ where: eq(MT.id, m.id) });
  if (existente?.deletedAt) return Response.json({ error: "Este registro fue eliminado" }, { status: 409 });
  if (!puede(u, "mantenimientos", existente ? "editar" : "crear"))
    return Response.json({ error: "No tiene permiso para registrar mantenimientos" }, { status: 403 });

  await db.transaction(async (tx) => {
    const datos = { ...m, costoManoObra: String(m.costoManoObra), updatedAt: new Date() };
    await tx
      .insert(MT)
      .values({ ...datos, createdBy: u.id, responsableId: u.id })
      .onConflictDoUpdate({ target: MT.id, set: datos });

    let compraId: string | null = null;
    if (compra) {
      const c = { ...compra, total: String(compra.total), mantenimientoId: m.id, updatedAt: new Date() };
      await tx.insert(CP).values({ ...c, createdBy: u.id }).onConflictDoUpdate({ target: CP.id, set: c });
      compraId = compra.id;
    }
    // Los materiales se reemplazan completos con lo que trae el formulario
    await tx.delete(MU).where(eq(MU.mantenimientoId, m.id));
    if (materiales.length)
      await tx.insert(MU).values(
        materiales.map((x) => ({
          ...x,
          mantenimientoId: m.id,
          compraId,
          cantidad: String(x.cantidad),
          valorUnitario: x.valorUnitario === null ? null : String(x.valorUnitario),
        })),
      );

    // Si el arreglo se refiere a un punto o tubería, su estado refleja el del arreglo
    const estadoRed = m.estado === "terminado" ? "operativo" : m.estado === "en_proceso" ? "en_reparacion" : m.tipo === "reparacion" && m.estado === "reportado" ? "con_falla" : null;
    if (estadoRed && m.elementoId)
      await tx.update(schema.elementosAcueducto).set({ estado: estadoRed, updatedAt: new Date() }).where(eq(schema.elementosAcueducto.id, m.elementoId));
    if (estadoRed && m.tramoId)
      await tx.update(schema.tramosAcueducto).set({ estado: estadoRed, updatedAt: new Date() }).where(eq(schema.tramosAcueducto.id, m.tramoId));
  });

  await auditar(u.id, existente ? "editar" : "crear", "mantenimiento", m.id, { tipo: m.tipo, estado: m.estado, materiales: materiales.length });
  return Response.json({ ok: true, id: m.id });
}
