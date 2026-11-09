"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { auditar } from "@/lib/auditoria";
import { CATEGORIAS_POR_FONDO, leerPesos } from "@/lib/dinero";
import { puede, ROLES, type Rol } from "@/lib/permisos";
import { requerirUsuario, type UsuarioSesion } from "@/lib/session";
import type { Estado } from "./auth";

const { movimientos: M, cuentas: C, movimientosHistorial: H } = schema;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function exigir(u: UsuarioSesion, accion: "crear" | "editar") {
  if (!puede(u, "libro_contable", accion))
    throw new Error("Solo la presidencia y la tesorería pueden registrar o corregir el libro de contabilidad");
}

async function quien(u: UsuarioSesion) {
  const x = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.id, u.id), columns: { cargo: true, rol: true, nombre: true } });
  return { nombre: x?.nombre ?? u.nombre, cargo: x?.cargo || ROLES[(x?.rol ?? "admin") as Rol] };
}

function refrescar() {
  revalidatePath("/libros/contabilidad");
  revalidatePath("/transparencia");
}

/** Abre el libro: crea la cuenta (caja o banco) de la Junta con su saldo inicial. */
export async function abrirLibro(_: Estado, form: FormData): Promise<Estado> {
  const u = await requerirUsuario();
  try {
    exigir(u, "crear");
  } catch (e) {
    return { error: (e as Error).message };
  }
  const nombre = String(form.get("nombre") ?? "").trim();
  const fecha = String(form.get("fechaSaldoInicial") ?? "");
  const saldo = leerPesos(form.get("saldoInicial"));
  if (nombre.length < 3) return { error: "Escriba el nombre de la cuenta o caja" };
  if (!FECHA.test(fecha)) return { error: "Elija la fecha del saldo inicial" };
  if (!Number.isFinite(saldo)) return { error: "Escriba el saldo inicial (puede ser 0)" };
  const digitos = String(form.get("ultimosDigitos") ?? "").trim();
  if (digitos && !/^\d{1,6}$/.test(digitos)) return { error: "Solo los últimos dígitos de la cuenta (máximo 6)" };
  const [c] = await db
    .insert(C)
    .values({
      nombre,
      fondo: "junta",
      tipo: String(form.get("tipo") ?? "banco") === "efectivo" ? "efectivo" : "banco",
      entidad: String(form.get("entidad") ?? "").trim() || null,
      ultimosDigitos: digitos || null,
      saldoInicial: String(saldo),
      fechaSaldoInicial: fecha,
      createdBy: u.id,
    })
    .returning({ id: C.id });
  await auditar(u.id, "crear", "cuenta", String(c.id), { nombre, saldo, fondo: "junta" });
  refrescar();
  return { ok: "Libro abierto" };
}

const asientoSchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  cuentaId: z.coerce.number().int().positive("Elija la cuenta o caja"),
  tipo: z.enum(["ingreso", "egreso"]),
  categoria: z.string().min(1, "Elija la categoría"),
  concepto: z.string().trim().min(3, "Escriba el concepto").max(300),
  fecha: z.string().regex(FECHA, "Fecha inválida"),
  comprobante: z.string().trim().max(40).optional(),
});

type Foto = { fecha: string; tipo: string; categoria: string; concepto: string; valor: string; comprobante: string | null; cuentaId: number };
const foto = (m: Foto) => ({ fecha: m.fecha, tipo: m.tipo, categoria: m.categoria, concepto: m.concepto, valor: Number(m.valor), comprobante: m.comprobante, cuentaId: m.cuentaId });

/** Registra un asiento nuevo o corrige uno existente. Devuelve su id para subir los comprobantes. */
export async function guardarAsiento(form: FormData): Promise<{ error?: string; id?: string }> {
  const u = await requerirUsuario();
  const p = asientoSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const valor = leerPesos(form.get("valor"));
  if (!Number.isFinite(valor) || valor <= 0) return { error: "Escriba un valor mayor a cero" };
  const cuenta = await db.query.cuentas.findFirst({ where: and(eq(C.id, p.data.cuentaId), eq(C.fondo, "junta")) });
  if (!cuenta) return { error: "La cuenta no pertenece al libro de la Junta" };
  if (!(CATEGORIAS_POR_FONDO.junta[p.data.tipo] as readonly string[]).includes(p.data.categoria)) return { error: "Categoría inválida" };
  const datos = {
    cuentaId: p.data.cuentaId,
    tipo: p.data.tipo,
    categoria: p.data.categoria,
    concepto: p.data.concepto,
    fecha: p.data.fecha,
    comprobante: p.data.comprobante || null,
    valor: String(valor),
  };
  const yo = await quien(u);

  try {
    if (p.data.id) {
      exigir(u, "editar");
      const antes = await db.query.movimientos.findFirst({ where: eq(M.id, p.data.id) });
      if (!antes) return { error: "El asiento no existe" };
      if (antes.estado === "anulado") return { error: "Un asiento anulado no se puede editar" };
      const ahora = new Date();
      await db.transaction(async (tx) => {
        await tx.update(M).set({ ...datos, actualizadoPor: u.id, actualizadoEn: ahora }).where(eq(M.id, p.data.id!));
        await tx.insert(H).values({
          movimientoId: p.data.id!,
          accion: "editar",
          usuarioId: u.id,
          usuarioNombre: yo.nombre,
          cargo: yo.cargo,
          antes: foto(antes),
          despues: foto({ ...datos, comprobante: datos.comprobante }),
          fecha: ahora,
        });
      });
      await auditar(u.id, "editar", "movimiento", p.data.id, { antes: foto(antes), despues: datos });
      refrescar();
      return { id: p.data.id };
    }

    exigir(u, "crear");
    const id = await db.transaction(async (tx) => {
      // En el libro de la Junta el asiento queda en firme al registrarse (lo hacen solo presidencia o tesorería)
      const [m] = await tx
        .insert(M)
        .values({ ...datos, estado: "aprobado", registradoPor: u.id, cargoRegistro: yo.cargo })
        .returning({ id: M.id });
      await tx.insert(H).values({ movimientoId: m.id, accion: "crear", usuarioId: u.id, usuarioNombre: yo.nombre, cargo: yo.cargo, despues: foto({ ...datos }) });
      return m.id;
    });
    await auditar(u.id, "crear", "movimiento", id, datos);
    refrescar();
    return { id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Anula un asiento (no se borra): deja de contar en el saldo y queda tachado con su motivo. */
export async function anularAsiento(id: string, motivo: string) {
  const u = await requerirUsuario();
  exigir(u, "editar");
  if (motivo.trim().length < 3) throw new Error("Escriba el motivo de la anulación");
  const m = await db.query.movimientos.findFirst({ where: eq(M.id, id) });
  if (!m || m.estado === "anulado") throw new Error("El asiento no existe o ya está anulado");
  const yo = await quien(u);
  const ahora = new Date();
  await db.transaction(async (tx) => {
    await tx.update(M).set({ estado: "anulado", motivo: motivo.trim(), actualizadoPor: u.id, actualizadoEn: ahora }).where(eq(M.id, id));
    await tx.insert(H).values({ movimientoId: id, accion: "anular", usuarioId: u.id, usuarioNombre: yo.nombre, cargo: yo.cargo, antes: foto(m), motivo: motivo.trim(), fecha: ahora });
  });
  await auditar(u.id, "anular", "movimiento", id, { motivo });
  refrescar();
}

/** Historial de un asiento (lo pueden ver quienes ven el libro, incluido el fiscal). */
export async function historialAsiento(id: string) {
  const u = await requerirUsuario();
  if (!puede(u, "libro_contable", "ver") && !puede(u, "tesoreria", "ver")) throw new Error("Sin acceso");
  return db
    .select({ accion: H.accion, usuario: H.usuarioNombre, cargo: H.cargo, antes: H.antes, despues: H.despues, motivo: H.motivo, fecha: H.fecha })
    .from(H)
    .where(eq(H.movimientoId, id))
    .orderBy(asc(H.fecha));
}
