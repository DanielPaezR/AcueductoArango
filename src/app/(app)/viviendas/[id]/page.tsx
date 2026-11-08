import { ChevronLeft, Droplets, MapPin, Navigation, Pencil, Phone, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { zocaloVivienda } from "@/components/fila-vivienda";
import { MapaPunto } from "@/components/mapa/dinamicos";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { TIPOS_PROYECTO } from "@/lib/ayudas";
import { fechaCorta } from "@/lib/dinero";
import { obtenerVivienda, viviendasCercanas } from "@/lib/consultas";
import { mantenimientosDe } from "@/lib/consultas-red";
import { HistorialArreglos } from "@/components/historial-arreglos";
import { miniatura } from "@/lib/imagenes";
import { edadPersona, ESTADO_VIVIENDA_LABEL } from "@/lib/opciones";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";
import { EliminarVivienda, SuprimirDatos } from "./eliminar";
import { urlPrivada } from "@/lib/cloudinary";

export const metadata = { title: "Vivienda" };

const siNo = (b: boolean | null) => (b === null ? null : b ? "Sí" : "No");

function Dato({ l, v }: { l: string; v: React.ReactNode }) {
  if (v === null || v === undefined || v === "") return null;
  return (
    <div>
      <dt className="text-sm text-stone-600">{l}</dt>
      <dd className="text-[1.05rem] font-semibold text-stone-900">{v}</dd>
    </div>
  );
}

export default async function FichaVivienda({ params }: PageProps<"/viviendas/[id]">) {
  const u = await requerirPermiso("censo", "ver");
  const { id } = await params;
  const d = await obtenerVivienda(id);
  if (!d) notFound();
  const { v, personas, adjuntos, sector, creador } = d;
  const jefe = personas.find((p) => p.esJefeHogar) ?? personas[0];
  const [cercanas, arreglos] = await Promise.all([
    viviendasCercanas(v.lat, v.lng, 20, v.id),
    puede(u, "mantenimientos", "ver") ? mantenimientosDe({ viviendaId: id }) : Promise.resolve([]),
  ]);
  const ayudas = puede(u, "ayudas", "ver")
    ? await db
        .select({ id: schema.participaciones.id, fecha: schema.participaciones.fecha, detalle: schema.participaciones.detalle, proyectoId: schema.proyectos.id, nombre: schema.proyectos.nombre, tipo: schema.proyectos.tipo })
        .from(schema.participaciones)
        .innerJoin(schema.proyectos, eq(schema.proyectos.id, schema.participaciones.proyectoId))
        .where(and(eq(schema.participaciones.viviendaId, id), isNull(schema.participaciones.deletedAt), isNull(schema.proyectos.deletedAt)))
    : [];
  const sinAutorizacion = !v.autorizacionDatos && personas.length > 0;
  const fotos = adjuntos.filter((a) => a.tipo !== "firma");
  const firma = adjuntos.find((a) => a.tipo === "firma");
  let urlFirma: string | null = null;
  try {
    urlFirma = firma ? (firma.privado ? urlPrivada(firma.publicId) : firma.url) : null;
  } catch {
    urlFirma = null;
  }
  const fmt = (f: Date) =>
    f.toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric" });
  const nombreJefe = jefe ? `${jefe.nombres} ${jefe.apellidos ?? ""}`.trim() : null;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/viviendas" className="inline-flex items-center gap-1 font-semibold text-marca-700 hover:underline">
        <ChevronLeft className="size-5" aria-hidden />
        Viviendas
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="num font-semibold text-stone-500">{v.codigo}</p>
          <h1 className="text-[1.75rem] leading-tight font-bold">{nombreJefe ?? "Vivienda sin familia registrada"}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {sector && <span className="chip bg-stone-200 text-stone-800">{sector.nombre}</span>}
            {v.usaAcueducto ? (
              <span className="chip bg-postigo-50 text-postigo-800 ring-1 ring-postigo-100">
                <Droplets className="size-4" aria-hidden />
                Con acueducto
              </span>
            ) : (
              <span className="chip bg-stone-100 text-stone-700">Sin acueducto</span>
            )}
            {v.estado !== "habitada" && <span className="chip bg-ocre-50 text-ocre-800">{ESTADO_VIVIENDA_LABEL[v.estado]}</span>}
            {sinAutorizacion && (
              <span className="chip bg-teja-50 text-teja-700 ring-1 ring-teja-100">
                <TriangleAlert className="size-4" aria-hidden />
                Sin autorización de datos
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {puede(u, "censo", "editar") && (
            <Link href={`/viviendas/${v.id}/editar`} className="btn-primario">
              <Pencil className="size-5" aria-hidden />
              Editar
            </Link>
          )}
          {puede(u, "censo", "eliminar") && <EliminarVivienda id={v.id} />}
        </div>
      </header>

      {cercanas.length > 0 && (
        <div className="rounded-lg bg-ocre-50 px-4 py-3 ring-1 ring-ocre-100" role="alert">
          <p className="font-semibold text-ocre-800">Posible casa repetida: hay otros registros muy cerca.</p>
          <ul className="mt-1 text-stone-800">
            {cercanas.map((c) => (
              <li key={c.id}>
                <Link href={`/viviendas/${c.id}`} className="font-semibold underline">{c.codigo} · {c.jefe ?? "Sin familia"}</Link> a{" "}
                <span className="num">{c.distancia}</span> m
              </li>
            ))}
          </ul>
          <p className="mt-1 text-sm text-stone-700">Si son la misma casa, deje la más completa y elimine la otra.</p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-[1.15fr_1fr]">
        <section className="tarjeta space-y-3" aria-label="Ubicación">
          <MapaPunto lat={v.lat} lng={v.lng} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="num text-sm text-stone-600">
              {v.lat.toFixed(6)}, {v.lng.toFixed(6)}
              {v.precisionM != null && !v.ubicacionAjustada && <> · ± {Math.round(v.precisionM)} m</>}
            </span>
            <a
              className="btn-secundario min-h-10 px-3.5 py-1.5 text-[0.95rem]"
              href={`https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation className="size-4" aria-hidden />
              Cómo llegar
            </a>
          </div>
          {v.referencia && (
            <p className="flex gap-2 text-stone-700">
              <MapPin className="mt-0.5 size-5 shrink-0 text-stone-500" aria-hidden />
              {v.referencia}
            </p>
          )}
        </section>

        <div className="space-y-5">
          <section className="tarjeta" aria-labelledby="casa">
            <h2 id="casa" className="mb-3 text-lg font-bold">La casa</h2>
            {v.nombrePredio || v.tenencia || v.actividadEconomica || v.observaciones ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Dato l="Predio" v={v.nombrePredio} />
                <Dato l="Alquilada o propia" v={v.tenencia} />
                <div className="col-span-2">
                  <Dato l="Principal sustento" v={v.actividadEconomica} />
                </div>
                <div className="col-span-2">
                  <Dato l="Observaciones" v={v.observaciones} />
                </div>
              </dl>
            ) : (
              <p className="text-stone-600">Sin datos registrados.</p>
            )}
          </section>

          <section className={`tarjeta zocalo ${zocaloVivienda({ ...v, personas: personas.length })}`} aria-labelledby="agua">
            <h2 id="agua" className="mb-3 flex items-center gap-2 text-lg font-bold">
              <Droplets className="size-5 text-postigo-700" aria-hidden />
              Acueducto
            </h2>
            {v.usaAcueducto ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 pb-1">
                <Dato l="Matrícula del derecho" v={siNo(v.tieneMatricula) ?? "Sin dato"} />
                <Dato l="Número de matrícula" v={v.numeroMatricula && <span className="num">{v.numeroMatricula}</span>} />
                <Dato l="Titular (casa alquilada)" v={v.titularMatriculaNombre} />
                <Dato l="Cédula del titular" v={v.titularMatriculaDocumento && <span className="num">{v.titularMatriculaDocumento}</span>} />
                <Dato
                  l="Teléfono del titular"
                  v={
                    v.titularMatriculaTelefono && (
                      <a className="num text-marca-700 underline" href={`tel:${v.titularMatriculaTelefono}`}>
                        {v.titularMatriculaTelefono}
                      </a>
                    )
                  }
                />
              </dl>
            ) : (
              <p className="pb-1 text-stone-700">
                No tiene servicio de acueducto{v.otraFuenteAgua ? `. Toma el agua de: ${v.otraFuenteAgua}` : ""}.
              </p>
            )}
          </section>
        </div>
      </div>

      <section className="tarjeta" aria-labelledby="familia">
        <h2 id="familia" className="mb-2 text-lg font-bold">
          Familia <span className="num font-normal text-stone-500">({personas.length})</span>
        </h2>
        {personas.length ? (
          <ul className="divide-y divide-stone-200">
            {personas.map((p) => {
              const e = edadPersona(p);
              return (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <span
                    className="num flex size-11 shrink-0 items-center justify-center rounded-full bg-marca-50 font-bold text-marca-800 ring-1 ring-marca-100"
                    aria-label={e !== null ? `${e} años` : "Edad sin dato"}
                  >
                    {e ?? "–"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-stone-900">
                      {p.nombres} {p.apellidos}
                    </div>
                    <div className="text-[0.94rem] text-stone-600">
                      {[
                        p.esJefeHogar ? "Cabeza de familia" : null,
                        e !== null ? `${e} años` : null,
                        p.numeroDocumento ? `Doc. ${p.numeroDocumento}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  {p.telefono && (
                    <a
                      href={`tel:${p.telefono}`}
                      className="btn-secundario min-h-11 px-3"
                      aria-label={`Llamar a ${p.nombres} al ${p.telefono}`}
                    >
                      <Phone className="size-5" aria-hidden />
                      <span className="num hidden sm:inline">{p.telefono}</span>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-stone-600">No hay personas registradas.</p>
        )}
      </section>

      {v.usaAcueducto && puede(u, "mantenimientos", "ver") && (
        <HistorialArreglos items={arreglos} nuevoHref={puede(u, "mantenimientos", "crear") ? `/mantenimientos/nuevo?vivienda=${id}` : undefined} />
      )}

      {ayudas.length > 0 && (
        <section className="tarjeta" aria-labelledby="ayudas">
          <h2 id="ayudas" className="mb-2 text-lg font-bold">Ayudas y proyectos</h2>
          <ul className="divide-y divide-stone-200">
            {ayudas.map((a) => (
              <li key={a.id} className="py-2.5">
                <Link href={`/ayudas/${a.proyectoId}`} className="font-semibold text-marca-700 hover:underline">{a.nombre}</Link>
                <div className="text-sm text-stone-600">
                  {TIPOS_PROYECTO[a.tipo as keyof typeof TIPOS_PROYECTO]} · <span className="num">{fechaCorta(a.fecha)}</span>
                  {a.detalle && <> · {a.detalle}</>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="tarjeta" aria-labelledby="autorizacion">
        <h2 id="autorizacion" className="mb-2 text-lg font-bold">Autorización de datos personales</h2>
        {v.datosSuprimidosEn ? (
          <p className="text-stone-700">
            Los datos personales de esta familia se suprimieron el{" "}
            <span className="num">{v.datosSuprimidosEn.toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}</span> a petición del titular.
          </p>
        ) : v.autorizacionDatos ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Dato l="Autorizó" v={[v.autorizacionNombre, v.autorizacionDocumento && `C.C. ${v.autorizacionDocumento}`].filter(Boolean).join(" · ")} />
            <Dato l="Cómo" v={v.autorizacionMedio === "firma" ? "Con firma" : v.autorizacionMedio === "verbal" ? "De palabra, ante el encuestador" : "Sin dato"} />
            <Dato l="Fecha" v={v.autorizacionFecha && v.autorizacionFecha.toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" })} />
            <Dato l="Versión de la política" v={v.autorizacionVersion} />
            {urlFirma && (
              <div className="col-span-2">
                <a href={urlFirma} target="_blank" rel="noreferrer" className="font-semibold text-marca-700 underline">Ver firma (enlace privado, vence en 1 hora)</a>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-stone-700">{personas.length ? "Esta familia no ha autorizado el tratamiento de sus datos." : "No hay datos personales registrados."}</p>
        )}
        {puede(u, "censo", "eliminar") && !v.datosSuprimidosEn && personas.length > 0 && (
          <div className="mt-4 border-t border-stone-200 pt-3">
            <p className="mb-2 text-sm text-stone-600">
              Si la familia pide que se borren sus datos o retira su autorización, use esta opción. La casa y su relación con el acueducto se conservan.
            </p>
            <SuprimirDatos id={v.id} />
          </div>
        )}
      </section>

      {fotos.length > 0 && (
        <section className="tarjeta" aria-labelledby="fotos">
          <h2 id="fotos" className="mb-3 text-lg font-bold">Fotos</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {fotos.map((a) => (
              <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={miniatura(a.url)!} alt={a.descripcion ?? "Foto de la vivienda"} className="aspect-[4/3] w-full rounded-lg object-cover" />
              </a>
            ))}
          </div>
        </section>
      )}

      <p className="text-sm text-stone-600">
        Registrada el {fmt(v.createdAt)}
        {creador ? ` por ${creador.nombre}` : ""} · Actualizada el {fmt(v.updatedAt)}
        {v.autorizacionDatos && v.autorizacionNombre ? ` · Autorizó el uso de datos: ${v.autorizacionNombre}` : ""}
      </p>
    </div>
  );
}
