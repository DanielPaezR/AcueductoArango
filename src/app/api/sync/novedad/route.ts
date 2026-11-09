import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { usuarioApi } from "@/lib/api";
import { auditar } from "@/lib/auditoria";
import { hoyBogota } from "@/lib/dinero";
import { puede } from "@/lib/permisos";
import { novedadSchema } from "@/lib/validacion";

/** Crea o actualiza una novedad u obra comunitaria. Idempotente por UUID (sirve para la cola sin conexión). */
export async function POST(req: Request) {
  const u = await usuarioApi();
  if (u instanceof Response) return u;
  const p = novedadSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: p.error.issues[0].message }, { status: 400 });

  const N = schema.novedades;
  const existente = await db.query.novedades.findFirst({ where: eq(N.id, p.data.id) });
  if (existente?.deletedAt) return Response.json({ error: "Esta novedad fue eliminada" }, { status: 409 });
  if (!puede(u, "novedades", existente ? "editar" : "crear"))
    return Response.json({ error: "No tiene permiso para registrar novedades" }, { status: 403 });

  const fechaRealizado = p.data.estado === "realizado" ? (existente?.fechaRealizado ?? hoyBogota()) : null;
  const datos = { ...p.data, fechaRealizado, updatedBy: u.id, updatedAt: new Date() };
  await db
    .insert(N)
    .values({ ...datos, createdBy: u.id })
    .onConflictDoUpdate({ target: N.id, set: datos });
  await auditar(u.id, existente ? "editar" : "crear", "novedad", p.data.id, { titulo: p.data.titulo, estado: p.data.estado });
  return Response.json({ ok: true, id: p.data.id });
}
