import { and, desc, eq, lt, sql } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { requerirPermiso } from "@/lib/session";

export const metadata = { title: "Bitácora" };

const ACCION: Record<string, string> = {
  crear: "Creó",
  editar: "Editó",
  eliminar: "Eliminó",
  anular: "Anuló",
  aprobar: "Aprobó",
  rechazar: "Rechazó",
  login: "Ingresó",
  login_fallido: "Intento fallido de ingreso",
  cambiar_password: "Cambió su contraseña",
  restablecer_password: "Restableció la contraseña",
  activar: "Activó",
  desactivar: "Desactivó",
  adjuntar: "Subió foto/soporte a",
  exportar: "Descargó reporte",
  respaldo: "Descargó respaldo completo",
  generar_periodo: "Generó cobros del mes",
  crear_desde_censo: "Creó suscriptores desde el censo",
  pasar_a_tesoreria: "Envió a tesorería",
  consulta_publica: "Consulta pública de estado de cuenta",
  suprimir_datos: "Suprimió datos personales de",
  aceptar_terminos: "Aceptó términos de uso",
};
const ENTIDAD: Record<string, string> = {
  vivienda: "vivienda",
  persona: "persona",
  usuario: "usuario",
  sector: "sector",
  suscriptor: "suscriptor",
  cargo: "cobro",
  pago: "pago",
  tarifa: "tarifa",
  periodo: "mes de cobro",
  cuenta: "cuenta",
  movimiento: "movimiento",
  elemento: "punto de la red",
  tramo: "tubería",
  mantenimiento: "arreglo",
  compra: "compra",
  proyecto: "ayuda/proyecto",
  participacion: "beneficiario",
  reporte: "",
  sistema: "",
  estado_cuenta: "",
};
const ENLACE: Record<string, string> = {
  vivienda: "/viviendas/",
  usuario: "/usuarios/",
  suscriptor: "/suscriptores/",
  elemento: "/acueducto/punto/",
  tramo: "/acueducto/tramo/",
  mantenimiento: "/mantenimientos/",
  proyecto: "/ayudas/",
};

export default async function Bitacora({ searchParams }: PageProps<"/bitacora">) {
  await requerirPermiso("usuarios", "ver");
  const sp = await searchParams;
  const antes = Number(sp.antes) || undefined;
  const entidad = typeof sp.entidad === "string" && sp.entidad in ENTIDAD ? sp.entidad : undefined;
  const A = schema.auditoria;
  const filas = await db
    .select({ id: A.id, fecha: A.fecha, accion: A.accion, entidad: A.entidad, entidadId: A.entidadId, usuario: schema.usuarios.nombre, cargo: schema.usuarios.cargo })
    .from(A)
    .leftJoin(schema.usuarios, eq(schema.usuarios.id, A.usuarioId))
    .where(and(antes ? lt(A.id, antes) : undefined, entidad ? eq(A.entidad, entidad) : undefined))
    .orderBy(desc(A.id))
    .limit(100);
  const [{ fallidos }] = await db
    .select({ fallidos: sql<number>`count(*)::int` })
    .from(A)
    .where(sql`${A.accion} = 'login_fallido' and ${A.fecha} > now() - interval '24 hours'`);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-[1.75rem] leading-tight font-bold">Bitácora</h1>
      <p className="text-stone-700">Todo lo que se hace en el sistema queda registrado aquí: quién, qué y cuándo. No se puede borrar.</p>
      {fallidos > 5 && (
        <p className="rounded-lg bg-teja-50 px-4 py-3 text-teja-700 ring-1 ring-teja-100" role="alert">
          <strong className="num">{fallidos}</strong> intentos fallidos de ingreso en las últimas 24 horas. Revise si alguien está intentando adivinar contraseñas.
        </p>
      )}
      <form className="flex gap-2">
        <select name="entidad" defaultValue={entidad ?? ""} className="input w-auto flex-1" aria-label="Filtrar por tipo">
          <option value="">Todo</option>
          {Object.entries(ENTIDAD)
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <option key={k} value={k}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
            ))}
        </select>
        <button className="btn-secundario">Filtrar</button>
      </form>
      <ul className="tarjeta divide-y divide-stone-200 p-0 sm:p-0">
        {filas.map((f) => {
          const href = f.entidadId && ENLACE[f.entidad] ? `${ENLACE[f.entidad]}${f.entidadId}` : null;
          const que = `${ACCION[f.accion] ?? f.accion} ${ENTIDAD[f.entidad] ?? f.entidad}`.trim();
          return (
            <li key={f.id} className="px-4 py-3 sm:px-5">
              <div className="font-semibold text-stone-900">
                {href ? (
                  <Link href={href} className="hover:underline">{que}</Link>
                ) : (
                  que
                )}
              </div>
              <div className="text-sm text-stone-600">
                {f.usuario ? `${f.usuario}${f.cargo ? ` (${f.cargo})` : ""}` : "Sistema / visitante"} ·{" "}
                <span className="num">{f.fecha.toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" })}</span>
              </div>
            </li>
          );
        })}
        {!filas.length && <li className="px-4 py-3 text-stone-600">Sin registros.</li>}
      </ul>
      {filas.length === 100 && (
        <Link href={`/bitacora?antes=${filas.at(-1)!.id}${entidad ? `&entidad=${entidad}` : ""}`} className="btn-secundario w-full">
          Ver anteriores
        </Link>
      )}
    </div>
  );
}
