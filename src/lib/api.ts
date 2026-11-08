import "server-only";
import { puede, type Accion, type Seccion } from "./permisos";
import { usuarioActual, type UsuarioSesion } from "./session";

/** Para route handlers: devuelve el usuario o una Response 401/403. */
export async function usuarioApi(
  seccion?: Seccion,
  accion: Accion = "ver",
): Promise<UsuarioSesion | Response> {
  const u = await usuarioActual();
  if (!u) return Response.json({ error: "Sesión vencida. Vuelve a ingresar." }, { status: 401 });
  if (seccion && !puede(u, seccion, accion))
    return Response.json({ error: "No tienes permiso para esta acción" }, { status: 403 });
  return u;
}
