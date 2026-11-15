import "server-only";
import { esSeccionMunicipal, puede, type Accion, type Seccion } from "./permisos";
import { usuarioActual, type UsuarioSesion } from "./session";

/** Para route handlers: devuelve el usuario o una Response 401/403. */
export async function usuarioApi(
  seccion?: Seccion,
  accion: Accion = "ver",
): Promise<UsuarioSesion | Response> {
  const u = await usuarioActual();
  if (!u) return Response.json({ error: "Sesión vencida. Ingrese de nuevo." }, { status: 401 });
  // Lo de una vereda se registra dentro de una vereda (el superadmin primero entra a una)
  if (!u.vereda && !(seccion && esSeccionMunicipal(seccion)))
    return Response.json({ error: "Elija primero la vereda en la que va a trabajar" }, { status: 403 });
  if (seccion && !puede(u, seccion, accion))
    return Response.json({ error: "No tiene permiso para esta acción" }, { status: 403 });
  return u;
}

/**
 * Envuelve un route handler: si la base de datos rechaza la escritura por ser de otra vereda (RLS, código 42501),
 * responde 403 con un mensaje claro en vez de un error 500.
 */
export function conRls(h: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await h(req);
    } catch (e) {
      const code = (e as { code?: string; cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code;
      if (code === "42501") return Response.json({ error: "Ese registro no pertenece a su vereda" }, { status: 403 });
      throw e;
    }
  };
}
