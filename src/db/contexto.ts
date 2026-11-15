import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { jwtVerify } from "jose";
import type { PoolClient } from "pg";

/**
 * Contexto de vereda de cada consulta a la base de datos.
 *
 * - "vereda": ve y escribe solo lo de su vereda (presidencia, tesorería, encuestadores…).
 * - "municipio": lee todas las veredas (alcaldía, superadmin sin vereda elegida); solo escribe
 *   lo municipal (proyectos y ayudas de la alcaldía).
 * - "ninguno": no ve nada (sin sesión).
 *
 * PostgreSQL aplica el filtro con las políticas RLS de drizzle/0012_multivereda.sql.
 */
export type Contexto = { vereda: number | null; alcance: "vereda" | "municipio" | "ninguno" };

const almacen = new AsyncLocalStorage<Contexto>();

/** Ejecuta `f` con un contexto fijo (p. ej. la página pública de una vereda, sin sesión). */
export function conContexto<T>(ctx: Contexto, f: () => PromiseLike<T>): Promise<T> {
  // Se espera DENTRO del contexto: las consultas de drizzle solo se ejecutan al hacerles await
  return almacen.run(ctx, async () => await f());
}

export const COOKIE_SESION = "vereda_session";
/** Superadmin: vereda en la que está trabajando (para poder registrar y corregir en ella). */
export const COOKIE_VISTA = "vereda_vista";

const ROLES_MUNICIPALES = new Set(["superadmin", "alcaldia", "alcaldia_admin"]);

/* Vereda y rol de cada usuario, recordados 30 s para no consultarlos en cada consulta */
const memoria = new Map<string, { vereda: number | null; rol: string; hasta: number }>();

/** Olvida lo recordado de un usuario (tras cambiarle la vereda o el rol). */
export function olvidarUsuario(id: string) {
  memoria.delete(id);
}

async function sesionDeLaPeticion(): Promise<{ usuario: string | null; vista: number | null } | null> {
  let jar: { get(n: string): { value: string } | undefined };
  try {
    const { cookies } = await import("next/headers");
    jar = await cookies();
  } catch {
    return null; // fuera de una petición (no debería pasar en la app)
  }
  const token = jar.get(COOKIE_SESION)?.value;
  const vista = Number(jar.get(COOKIE_VISTA)?.value) || null;
  if (!token || !process.env.SESSION_SECRET) return { usuario: null, vista };
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET), { algorithms: ["HS256"] });
    return { usuario: typeof payload.sub === "string" ? payload.sub : null, vista };
  } catch {
    return { usuario: null, vista };
  }
}

/** Calcula el contexto antes de pedir la conexión (mientras seguimos dentro de la petición). */
export async function prepararContexto(): Promise<(c: PoolClient) => Promise<Contexto>> {
  const fijo = almacen.getStore();
  if (fijo) return async () => fijo;
  const s = await sesionDeLaPeticion();
  return async (client) => {
    if (!s?.usuario) return { vereda: null, alcance: "ninguno" };
    let u = memoria.get(s.usuario);
    if (!u || u.hasta < Date.now()) {
      const { rows } = await client.query<{ vereda_id: number | null; rol: string; activo: boolean }>(
        "select vereda_id, rol, activo from usuarios where id = $1",
        [s.usuario],
      );
      const r = rows[0];
      u = { vereda: r?.activo ? r.vereda_id : null, rol: r?.activo ? r.rol : "", hasta: Date.now() + 30_000 };
      memoria.set(s.usuario, u);
    }
    if (!u.rol) return { vereda: null, alcance: "ninguno" };
    // El superadmin trabaja en la vereda que eligió; si no eligió, ve todo el municipio
    if (u.rol === "superadmin" && s.vista) return { vereda: s.vista, alcance: "vereda" };
    if (ROLES_MUNICIPALES.has(u.rol)) return { vereda: null, alcance: "municipio" };
    return u.vereda ? { vereda: u.vereda, alcance: "vereda" } : { vereda: null, alcance: "ninguno" };
  };
}

export function contextoFijo() {
  return almacen.getStore() ?? null;
}
