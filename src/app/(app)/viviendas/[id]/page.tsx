import Link from "next/link";
import { notFound } from "next/navigation";
import { MapaPunto } from "@/components/mapa/dinamicos";
import { obtenerVivienda } from "@/lib/consultas";
import { miniatura } from "@/lib/imagenes";
import { edad, ESTADO_VIVIENDA_LABEL } from "@/lib/opciones";
import { puede } from "@/lib/permisos";
import { requerirPermiso } from "@/lib/session";
import { EliminarVivienda } from "./eliminar";

export const metadata = { title: "Vivienda" };

const siNo = (b: boolean | null) => (b === null ? null : b ? "Sí" : "No");

function Dato({ l, v }: { l: string; v: React.ReactNode }) {
  if (v === null || v === undefined || v === "") return null;
  return (
    <div>
      <dt className="text-xs text-stone-500">{l}</dt>
      <dd className="font-medium">{v}</dd>
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
  const fmt = (f: Date) => f.toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href="/viviendas" className="text-sm text-marca-700 hover:underline">← Viviendas</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-sm text-stone-500">{v.codigo}</div>
          <h1 className="text-2xl font-bold">{jefe ? `${jefe.nombres} ${jefe.apellidos ?? ""}` : "Vivienda sin familia registrada"}</h1>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            {sector && <span className="rounded-full bg-stone-200 px-2 py-0.5">{sector.nombre}</span>}
            {v.usaAcueducto ? (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">💧 Usa acueducto</span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Sin acueducto{v.otraFuenteAgua ? ` · ${v.otraFuenteAgua}` : ""}</span>
            )}
            <span className="rounded-full bg-stone-100 px-2 py-0.5">{ESTADO_VIVIENDA_LABEL[v.estado]}</span>
            {!v.autorizacionDatos && personas.length > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800">Sin autorización de datos</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {puede(u, "censo", "editar") && <Link href={`/viviendas/${v.id}/editar`} className="btn-primario">Editar</Link>}
          {puede(u, "censo", "eliminar") && <EliminarVivienda id={v.id} />}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="tarjeta space-y-2">
          <MapaPunto lat={v.lat} lng={v.lng} />
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-mono text-stone-600">
              {v.lat.toFixed(6)}, {v.lng.toFixed(6)}
              {v.precisionM != null && !v.ubicacionAjustada && <span className="text-stone-400"> ± {Math.round(v.precisionM)} m</span>}
            </span>
            <a
              className="font-semibold text-marca-700"
              href={`https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              Cómo llegar ↗
            </a>
          </div>
          {v.referencia && <p className="text-sm text-stone-600">📍 {v.referencia}</p>}
        </div>

        <div className="tarjeta">
          <h2 className="mb-3 font-semibold">La vivienda</h2>
          {![v.nombrePredio, v.tenencia, v.materialParedes, v.materialPiso, v.numCuartos, v.energia, v.gas, v.internet, v.senalCelular, v.saneamiento, v.manejoBasuras, v.actividadEconomica, v.observaciones].some((x) => x !== null && x !== "") && (
            <p className="text-sm text-stone-500">Sin características registradas.</p>
          )}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Dato l="Predio / finca" v={v.nombrePredio} />
            <Dato l="Tenencia" v={v.tenencia} />
            <Dato l="Paredes" v={v.materialParedes} />
            <Dato l="Piso" v={v.materialPiso} />
            <Dato l="Cuartos" v={v.numCuartos} />
            <Dato l="Energía" v={siNo(v.energia)} />
            <Dato l="Cocina con" v={v.gas} />
            <Dato l="Internet" v={siNo(v.internet)} />
            <Dato l="Señal celular" v={v.senalCelular} />
            <Dato l="Aguas residuales" v={v.saneamiento} />
            <Dato l="Basuras" v={v.manejoBasuras} />
            <Dato l="Altitud" v={v.altitudM != null ? `${v.altitudM} m` : null} />
            <div className="col-span-2">
              <Dato l="Actividad económica" v={v.actividadEconomica} />
            </div>
            <div className="col-span-2">
              <Dato l="Observaciones" v={v.observaciones} />
            </div>
          </dl>
        </div>
      </div>

      <div className="tarjeta">
        <h2 className="mb-3 font-semibold">Familia ({personas.length})</h2>
        {personas.length ? (
          <div className="divide-y divide-stone-100">
            {personas.map((p) => {
              const e = edad(p.fechaNacimiento);
              return (
                <details key={p.id} className="py-2">
                  <summary className="flex cursor-pointer list-none items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marca-100 text-sm font-bold text-marca-800">
                      {e ?? "?"}
                    </span>
                    <span className="flex-1">
                      <span className="font-medium">{p.nombres} {p.apellidos}</span>
                      {p.esJefeHogar && <span className="ml-2 rounded bg-marca-100 px-1.5 text-xs text-marca-800">Jefe(a)</span>}
                      <span className="block text-sm text-stone-500">
                        {[p.parentesco, e !== null ? `${e} años` : null, p.tipoDocumento && p.numeroDocumento ? `${p.tipoDocumento} ${p.numeroDocumento}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {p.telefono && (
                      <a href={`tel:${p.telefono}`} className="text-sm text-marca-700">📞</a>
                    )}
                  </summary>
                  <dl className="mt-2 grid grid-cols-2 gap-3 pl-12 text-sm sm:grid-cols-3">
                    <Dato l="Sexo" v={p.sexo} />
                    <Dato l="Nacimiento" v={p.fechaNacimiento} />
                    <Dato l="Teléfono" v={p.telefono} />
                    <Dato l="Escolaridad" v={p.escolaridad} />
                    <Dato l="Estudia" v={siNo(p.estudiaActualmente)} />
                    <Dato l="Ocupación" v={p.ocupacion} />
                    <Dato l="Salud" v={[p.regimenSalud, p.eps].filter(Boolean).join(" · ")} />
                    <Dato l="SISBÉN" v={p.sisbenGrupo} />
                    <Dato l="Discapacidad" v={p.discapacidad ? p.tipoDiscapacidad || "Sí" : null} />
                    <Dato l="Grupo étnico" v={p.grupoEtnico !== "Ninguno" ? p.grupoEtnico : null} />
                    <Dato l="Víctima del conflicto" v={siNo(p.victimaConflicto)} />
                    <Dato l="Afiliado JAC" v={p.afiliadoJac ? "Sí" : null} />
                    <Dato l="Observaciones" v={p.observaciones} />
                  </dl>
                </details>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-stone-500">No hay personas registradas.</p>
        )}
      </div>

      {adjuntos.length > 0 && (
        <div className="tarjeta">
          <h2 className="mb-3 font-semibold">Fotos</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {adjuntos.map((a) => (
              <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={miniatura(a.url)!} alt={a.descripcion ?? ""} className="aspect-[4/3] w-full rounded-lg object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-stone-400">
        Registrada {fmt(v.createdAt)}
        {creador ? ` por ${creador.nombre}` : ""} · Actualizada {fmt(v.updatedAt)}
        {v.autorizacionDatos && v.autorizacionNombre ? ` · Autorizó datos: ${v.autorizacionNombre}` : ""}
      </p>
    </div>
  );
}
