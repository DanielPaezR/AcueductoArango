import { and, asc, eq } from "drizzle-orm";
import { ArrowRightLeft, ChevronLeft, Globe } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alerta, Barras, Cifra, pct } from "@/components/municipio/ui";
import { db, schema } from "@/db";
import { conContexto } from "@/db/contexto";
import { fechaCorta, pesos } from "@/lib/dinero";
import { gruposPorVereda, indicadoresPorVereda } from "@/lib/municipio";
import { GRUPOS_EDAD } from "@/lib/opciones";
import { puede, ROLES, type Rol } from "@/lib/permisos";
import { requerirMunicipio } from "@/lib/session";
import { ClaveVeredaForm, EditarVeredaForm, UsuarioVeredaForm } from "../forms";

export const metadata = { title: "Vereda" };

export default async function FichaVereda({ params, searchParams }: PageProps<"/municipio/veredas/[id]">) {
  const { id: idTxt } = await params;
  const id = Number(idTxt);
  const u = await requerirMunicipio("municipio", "ver", `/municipio/veredas/${idTxt}`);
  if (!Number.isInteger(id)) notFound();
  const sp = await searchParams;
  const v = await db.query.veredas.findFirst({ where: eq(schema.veredas.id, id) });
  if (!v) notFound();
  const [indicadores, grupos, usuarios, config] = await Promise.all([
    indicadoresPorVereda(),
    gruposPorVereda(),
    db
      .select({ id: schema.usuarios.id, nombre: schema.usuarios.nombre, username: schema.usuarios.username, rol: schema.usuarios.rol, cargo: schema.usuarios.cargo, activo: schema.usuarios.activo, ultimoAcceso: schema.usuarios.ultimoAcceso })
      .from(schema.usuarios)
      .where(and(eq(schema.usuarios.veredaId, id)))
      .orderBy(asc(schema.usuarios.nombre)),
    conContexto({ vereda: id, alcance: "vereda" }, () =>
      db.query.configuracion.findFirst({ where: eq(schema.configuracion.clave, "modulos") }),
    ),
  ]);
  const i = indicadores.find((x) => x.id === id)!;
  const g = grupos.filter((x) => x.vereda_id === id);
  const acueducto = Boolean((config?.valor as { acueducto?: boolean } | undefined)?.acueducto ?? true);
  const editar = puede(u, "municipio_veredas", "editar");
  const anio = new Date().getFullYear();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/municipio/veredas" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Veredas
      </Link>
      {sp.creada && (
        <p className="rounded-lg bg-marca-50 px-4 py-3 text-marca-800 ring-1 ring-marca-100" role="status">
          Vereda creada. Entréguele a la presidencia su usuario y la contraseña temporal: al entrar, la cambia y crea a su equipo.
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem] leading-tight font-bold">Vereda {v.nombre}</h1>
          <p className="text-stone-600">{v.nombreJac ?? `Junta de Acción Comunal de la vereda ${v.nombre}`}{v.nit && ` · NIT ${v.nit}`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/transparencia?vereda=${v.slug}`} className="btn-secundario">
            <Globe className="size-5" aria-hidden />
            Página pública
          </Link>
          {u.rol === "superadmin" && (
            <a href={`/api/vista?vereda=${v.id}`} className="btn-primario">
              <ArrowRightLeft className="size-5" aria-hidden />
              Trabajar en esta vereda
            </a>
          )}
        </div>
      </div>

      <section className="tarjeta">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Cifra titulo="Viviendas" valor={i.viviendas} detalle={`${pct(i.viviendas, i.meta)} % de ${i.meta}`} />
          <Cifra titulo="Habitantes" valor={i.habitantes} detalle={`${i.hogares} hogares`} />
          <Cifra titulo="Adultos mayores" valor={i.mayores} />
          <Cifra titulo="Con discapacidad" valor={i.con_discapacidad} />
          <Cifra titulo="Encuestas pendientes" valor={i.pendientes} />
          <Cifra titulo="Novedades activas" valor={i.novedades_activas} detalle={`${i.obras_realizadas_anio} realizadas en ${anio}`} />
          <Cifra titulo="Saldo de la Junta" valor={pesos(i.saldo_junta)} detalle={`+${pesos(i.ingresos_anio)} / −${pesos(i.egresos_anio)} en ${anio}`} />
          <Cifra titulo="Última asamblea" valor={i.ultima_asamblea ? fechaCorta(i.ultima_asamblea) : "—"} detalle={`${i.actas_anio} acta(s) en ${anio}`} />
          <Cifra titulo={`Familias con ayudas ${anio}`} valor={i.ayudas_anio} />
          <Cifra titulo="Autorizan a la alcaldía" valor={i.autorizadas_alcaldia} detalle={`${pct(i.autorizadas_alcaldia, i.viviendas)} % de las viviendas`} />
          {acueducto && <Cifra titulo="Con acueducto" valor={i.con_acueducto} />}
          <Cifra titulo="Usuarios activos" valor={i.usuarios} />
        </dl>
        {(!i.presidencia || i.pendientes > 0 || !i.ultima_asamblea) && (
          <ul className="mt-4 space-y-1 border-t border-stone-200 pt-3">
            {!i.presidencia && <Alerta>No tiene un usuario de presidencia activo.</Alerta>}
            {i.pendientes > 0 && <Alerta>{i.pendientes} casa(s) con la encuesta pendiente de completar.</Alerta>}
            {!i.ultima_asamblea && <Alerta>No ha registrado actas de asamblea.</Alerta>}
          </ul>
        )}
      </section>

      <section className="tarjeta">
        <h2 className="mb-4 text-lg font-bold">Población por grupo de edad</h2>
        <Barras
          filas={GRUPOS_EDAD.map((gr) => ({
            etiqueta: `${gr.label} (${gr.rango})`,
            valor: g.filter((x) => x.grupo === gr.id).reduce((a, x) => a + x.n, 0),
            href: `/municipio/poblacion?vereda=${id}&grupo=${gr.id}`,
          }))}
        />
      </section>

      <section className="tarjeta space-y-3">
        <h2 className="text-lg font-bold">Usuarios de la vereda</h2>
        <ul className="divide-y divide-stone-100">
          {usuarios.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span>
                <span className="font-semibold">{x.nombre}</span> <span className="text-stone-600">· {x.username} · {x.cargo || ROLES[x.rol as Rol]}</span>
                {!x.activo && <span className="chip ml-2 bg-stone-200 text-stone-700">Inactivo</span>}
                <span className="block text-sm text-stone-600">
                  {x.ultimoAcceso ? `Último acceso ${x.ultimoAcceso.toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}` : "Nunca ha entrado"}
                </span>
              </span>
              {editar && <ClaveVeredaForm id={x.id} />}
            </li>
          ))}
          {!usuarios.length && <li className="py-2 text-stone-600">Sin usuarios.</li>}
        </ul>
        {puede(u, "municipio_veredas", "crear") && (
          <details className="rounded-lg border border-stone-200 p-3">
            <summary className="cursor-pointer font-semibold">Crear un usuario para esta vereda (p. ej. nueva presidencia)</summary>
            <div className="mt-3">
              <UsuarioVeredaForm veredaId={id} />
            </div>
          </details>
        )}
      </section>

      {editar && (
        <section className="tarjeta space-y-3">
          <h2 className="text-lg font-bold">Datos de la vereda y su Junta</h2>
          <EditarVeredaForm v={v} acueducto={acueducto} />
        </section>
      )}
    </div>
  );
}
