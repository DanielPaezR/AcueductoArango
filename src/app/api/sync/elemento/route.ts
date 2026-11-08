import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { usuarioApi } from "@/lib/api";
import { auditar } from "@/lib/auditoria";
import { puede } from "@/lib/permisos";
import { elementoSchema } from "@/lib/validacion";

/** Crea o actualiza un punto de la red (bocatoma, tanque, válvula…). Idempotente por UUID. */
export async function POST(req: Request) {
  const u = await usuarioApi();
  if (u instanceof Response) return u;
  const p = elementoSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: p.error.issues[0].message }, { status: 400 });

  const existente = await db.query.elementosAcueducto.findFirst({ where: eq(schema.elementosAcueducto.id, p.data.id) });
  if (existente?.deletedAt) return Response.json({ error: "Este punto fue eliminado" }, { status: 409 });
  if (!puede(u, "acueducto_red", existente ? "editar" : "crear"))
    return Response.json({ error: "No tiene permiso para registrar puntos de la red" }, { status: 403 });

  const datos = { ...p.data, updatedAt: new Date() };
  await db
    .insert(schema.elementosAcueducto)
    .values({ ...datos, createdBy: u.id })
    .onConflictDoUpdate({ target: schema.elementosAcueducto.id, set: datos });
  await auditar(u.id, existente ? "editar" : "crear", "elemento", p.data.id, { tipo: p.data.tipo, estado: p.data.estado });
  return Response.json({ ok: true, id: p.data.id });
}
