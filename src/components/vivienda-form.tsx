"use client";

import { Camera, Droplets, House, MapPin, Plus, Signature, Smartphone, UserRound, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Campo, Opciones, Seccion, Select, SiNo, useGps } from "@/components/campos";
import { MapaSelector } from "@/components/mapa/dinamicos";
import { dbLocal } from "@/lib/offline/db";
import { comprimirImagen, sincronizar } from "@/lib/offline/sync";
import { edadPersona, OPC } from "@/lib/opciones";
import type { PersonaInput, ViviendaInput } from "@/lib/validacion";

type Sector = { id: number; nombre: string };
type Vivienda = Omit<ViviendaInput, "lat" | "lng"> & { lat: number | null; lng: number | null };

const nuevaPersona = (jefe = false): PersonaInput => ({
  id: crypto.randomUUID(),
  nombres: "",
  esJefeHogar: jefe,
  parentesco: jefe ? "Jefe(a) de hogar" : null,
  tipoDocumento: jefe ? "CC" : null,
  discapacidad: false,
  afiliadoJac: false,
});

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Une nombres y apellidos de registros antiguos en un solo "nombre completo". */
const unirNombre = (p: PersonaInput): PersonaInput =>
  p.apellidos ? { ...p, nombres: `${p.nombres} ${p.apellidos}`.trim(), apellidos: null } : p;

const viviendaVacia = (): Vivienda => ({
  id: crypto.randomUUID(),
  lat: null,
  lng: null,
  usaAcueducto: false,
  autorizacionDatos: false,
  ubicacionAjustada: false,
  estado: "habitada",
});

/* ---------- edad ---------- */

/** Campo de edad: muestra la edad actual y, si se cambia, la guarda como "edad reportada hoy". */
function EdadInput({ p, onChange }: { p: PersonaInput; onChange: (p: PersonaInput) => void }) {
  const actual = edadPersona(p);
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={120}
      className="input"
      value={actual ?? ""}
      onChange={(e) =>
        onChange({
          ...p,
          fechaNacimiento: null,
          edadReportada: e.target.value === "" ? null : Number(e.target.value),
          edadReportadaEn: e.target.value === "" ? null : hoyISO(),
        })
      }
    />
  );
}

/* ---------- formulario principal ---------- */

export function ViviendaForm({
  sectores,
  inicial,
}: {
  sectores: Sector[];
  inicial?: { vivienda: Vivienda & { codigo?: string | null }; personas: PersonaInput[] };
}) {
  const router = useRouter();
  const editando = Boolean(inicial);
  const [v, setV] = useState<Vivienda>(() => inicial?.vivienda ?? viviendaVacia());
  const [jefe, setJefe] = useState<PersonaInput>(() => {
    const j = inicial?.personas.find((p) => p.esJefeHogar) ?? inicial?.personas[0];
    return j ? unirNombre({ ...j, esJefeHogar: true }) : nuevaPersona(true);
  });
  const [miembros, setMiembros] = useState<PersonaInput[]>(() =>
    (inicial?.personas ?? []).filter((p) => p.id !== jefe.id).map((p) => unirNombre({ ...p, esJefeHogar: false })),
  );
  const [fotos, setFotos] = useState<{ id: string; blob: Blob; url: string }[]>([]);
  const [verMapa, setVerMapa] = useState(editando);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();
  const [guardadaLocal, setGuardadaLocal] = useState(false);
  const gps = useGps();

  const set = <K extends keyof Vivienda>(k: K, val: Vivienda[K]) => setV((x) => ({ ...x, [k]: val }));
  const setJ = <K extends keyof PersonaInput>(k: K, val: PersonaInput[K]) => setJefe((x) => ({ ...x, [k]: val }));
  const setM = (id: string, np: PersonaInput) => setMiembros((xs) => xs.map((x) => (x.id === id ? np : x)));
  const pos: [number, number] | null = v.lat !== null && v.lng !== null ? [v.lat, v.lng] : null;
  const alquilada = v.tenencia === "Alquilada";

  const tomarGps = () =>
    gps.iniciar((p) =>
      setV((x) => ({
        ...x,
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        precisionM: Math.round(p.coords.accuracy * 10) / 10,
        altitudM: p.coords.altitude !== null ? Math.round(p.coords.altitude) : null,
        ubicacionAjustada: false,
      })),
    );

  // Al crear, arrancar el GPS de una vez
  useEffect(() => {
    if (!editando) tomarGps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const agregarFotos = async (files: FileList | null) => {
    if (!files) return;
    const nuevas = await Promise.all(
      Array.from(files).map(async (f) => {
        const blob = await comprimirImagen(f);
        return { id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) };
      }),
    );
    setFotos((x) => [...x, ...nuevas]);
  };

  const reiniciar = () => {
    setV(viviendaVacia());
    setJefe(nuevaPersona(true));
    setMiembros([]);
    fotos.forEach((f) => URL.revokeObjectURL(f.url));
    setFotos([]);
    setGuardadaLocal(false);
    setError(undefined);
    window.scrollTo({ top: 0 });
    tomarGps();
  };

  const guardar = async () => {
    setError(undefined);
    if (!pos) return setError("Falta la ubicación: use el GPS o marque la casa en el mapa.");
    if (miembros.some((m) => !m.nombres.trim())) return setError("Hay miembros sin nombre: complételos o quítelos.");
    if (!jefe.nombres.trim() && miembros.length) return setError("Escriba el nombre de la cabeza de familia.");
    const personas = [...(jefe.nombres.trim() ? [jefe] : []), ...miembros].map((p) => ({ ...p, nombres: p.nombres.trim() }));
    if (personas.length && !v.autorizacionDatos)
      return setError("Para registrar datos de las personas se necesita la autorización de tratamiento de datos.");
    if (v.autorizacionDatos && !v.autorizacionNombre?.trim())
      return setError("Escriba el nombre de quien autoriza el tratamiento de datos.");

    // Limpiar respuestas que no aplican
    const vivienda = {
      ...v,
      lat: pos[0],
      lng: pos[1],
      otraFuenteAgua: v.usaAcueducto ? null : v.otraFuenteAgua,
      tieneMatricula: v.usaAcueducto ? v.tieneMatricula : null,
      numeroMatricula: v.usaAcueducto && v.tieneMatricula ? v.numeroMatricula : null,
      titularMatriculaNombre: v.usaAcueducto && alquilada ? v.titularMatriculaNombre : null,
      titularMatriculaDocumento: v.usaAcueducto && alquilada ? v.titularMatriculaDocumento : null,
      titularMatriculaTelefono: v.usaAcueducto && alquilada ? v.titularMatriculaTelefono : null,
    };

    setGuardando(true);
    gps.detener();
    try {
      await dbLocal.transaction("rw", dbLocal.viviendas, dbLocal.fotos, async () => {
        await dbLocal.viviendas.put({
          id: v.id,
          payload: { vivienda, personas },
          etiqueta: jefe.nombres.trim() || v.nombrePredio || v.referencia || "Vivienda sin familia",
          guardadoEn: Date.now(),
          intentos: 0,
        });
        for (const f of fotos)
          await dbLocal.fotos.put({
            id: f.id,
            entidad: "vivienda",
            entidadId: v.id,
            tipo: "foto",
            blob: f.blob,
            guardadoEn: Date.now(),
            intentos: 0,
          });
      });

      if (navigator.onLine) {
        await sincronizar();
        const sigue = await dbLocal.viviendas.get(v.id);
        if (!sigue) {
          router.push(`/viviendas/${v.id}`);
          router.refresh();
          return;
        }
        // Error de validación del servidor: mostrarlo (los datos siguen guardados en el teléfono)
        if (sigue.error && !/fetch|network/i.test(sigue.error)) setError(`El servidor respondió: ${sigue.error}`);
      }
      setGuardadaLocal(true);
    } catch (e) {
      setError(`No se pudo guardar: ${(e as Error).message}`);
    } finally {
      setGuardando(false);
    }
  };

  if (guardadaLocal)
    return (
      <div className="tarjeta space-y-4 py-10 text-center">
        <Smartphone className="mx-auto size-12 text-marca-700" aria-hidden />
        <h2 className="text-xl font-bold">Guardada en el teléfono</h2>
        <p className="text-stone-600">
          No hay señal en este momento. La vivienda se subirá sola cuando vuelva la conexión (o desde “Pendientes”).
        </p>
        {error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{error}</p>}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          {!editando && (
            <button className="btn-primario" onClick={reiniciar}>
              + Registrar otra vivienda
            </button>
          )}
          <Link className="btn-secundario" href="/viviendas/pendientes">Ver pendientes</Link>
        </div>
      </div>
    );

  return (
    <div className="space-y-4 pb-28">
      {/* Ubicación */}
      <Seccion titulo="Ubicación de la casa" icono={MapPin}>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primario" onClick={tomarGps} disabled={gps.estado === "buscando"}>
            {gps.estado === "buscando" ? "Buscando señal GPS…" : pos ? "Volver a tomar GPS" : "Tomar ubicación GPS"}
          </button>
          <button type="button" className="btn-secundario" onClick={() => setVerMapa(!verMapa)}>
            {verMapa ? "Ocultar mapa" : "Ajustar en el mapa"}
          </button>
        </div>
        {pos ? (
          <div className="text-sm">
            <span className="num text-stone-700">{pos[0].toFixed(6)}, {pos[1].toFixed(6)}</span>
            {v.precisionM != null && !v.ubicacionAjustada && (
              <span
                className={`chip ml-2 ${
                  v.precisionM <= 10 ? "bg-marca-100 text-marca-800" : v.precisionM <= 25 ? "bg-ocre-100 text-ocre-800" : "bg-teja-100 text-teja-700"
                }`}
              >
                ± {Math.round(v.precisionM)} m
              </span>
            )}
            {v.ubicacionAjustada && <span className="ml-2 chip ml-2 bg-postigo-50 text-postigo-800">Ajustada en el mapa</span>}
          </div>
        ) : (
          <p className="text-stone-600">Párese frente a la casa y tome la ubicación.</p>
        )}
        {gps.estado === "buscando" && gps.lectura && (
          <p className="text-sm text-stone-600" role="status">Mejorando la precisión… espere unos segundos para un punto más exacto.</p>
        )}
        {gps.error && <p className="text-teja-700" role="alert">{gps.error}</p>}
        {verMapa && (
          <>
            <MapaSelector
              pos={pos}
              precision={v.ubicacionAjustada ? null : v.precisionM}
              onChange={([lat, lng]) => {
                gps.detener();
                setV((x) => ({ ...x, lat, lng, ubicacionAjustada: true }));
              }}
            />
            <p className="text-sm text-stone-600">
              Toque el mapa o arrastre la casa para corregir el punto. Sin señal el mapa puede verse vacío, pero el GPS sí funciona.
            </p>
          </>
        )}
        {sectores.length > 0 && (
          <Campo label="Sector">
            <select className="input" value={v.sectorId ?? ""} onChange={(e) => set("sectorId", e.target.value ? Number(e.target.value) : null)}>
              <option value="">—</option>
              {sectores.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </Campo>
        )}
      </Seccion>

      {/* 1–4 Cabeza de familia */}
      <Seccion titulo="Cabeza de familia" icono={UserRound}>
        <Campo label="1. Nombre de la cabeza de familia">
          <input className="input" autoCapitalize="words" value={jefe.nombres} onChange={(e) => setJ("nombres", e.target.value)} />
        </Campo>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Campo label="2. Edad">
            <EdadInput p={jefe} onChange={setJefe} />
          </Campo>
          <Campo label="3. Cédula">
            <input className="input" inputMode="numeric" value={jefe.numeroDocumento ?? ""} onChange={(e) => setJ("numeroDocumento", e.target.value)} />
          </Campo>
          <Campo label="4. Teléfono" className="col-span-2 sm:col-span-1">
            <input className="input" inputMode="tel" value={jefe.telefono ?? ""} onChange={(e) => setJ("telefono", e.target.value)} />
          </Campo>
        </div>
      </Seccion>

      {/* 5, 6, 8 La casa */}
      <Seccion titulo="La casa" icono={House}>
        <Campo label="5. Nombre del predio o referencia">
          <input className="input" placeholder="Nombre de la finca o predio" value={v.nombrePredio ?? ""} onChange={(e) => set("nombrePredio", e.target.value)} />
          <input
            className="input mt-2"
            placeholder="Referencia: ej. después de la escuela, portón verde"
            value={v.referencia ?? ""}
            onChange={(e) => set("referencia", e.target.value)}
          />
        </Campo>
        <Campo label="6. ¿Alquilada o propia?">
          <Opciones value={v.tenencia} onChange={(x) => set("tenencia", x)} opciones={OPC.tenencia} />
        </Campo>
        <Campo label="8. Principal sustento de la casa">
          <input className="input" placeholder="Ej: café, ganadería, jornal, pensión…" value={v.actividadEconomica ?? ""} onChange={(e) => set("actividadEconomica", e.target.value)} />
        </Campo>
      </Seccion>

      {/* 7 Demás miembros */}
      <Seccion titulo={`7. Demás miembros de la casa (${miembros.length})`} icono={UsersRound}>
        {miembros.map((m, i) => (
          <div key={m.id} className="space-y-2 rounded-lg border border-stone-200 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-stone-600">Miembro {i + 1}</span>
              <button
                type="button"
                className="min-h-10 px-2 font-semibold text-teja-700"
                onClick={() => (!m.nombres || confirm("¿Quitar este miembro?")) && setMiembros((xs) => xs.filter((x) => x.id !== m.id))}
              >
                Quitar
              </button>
            </div>
            <input
              className="input"
              placeholder="Nombre completo"
              autoCapitalize="words"
              value={m.nombres}
              onChange={(e) => setM(m.id, { ...m, nombres: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Edad</label>
                <EdadInput p={m} onChange={(np) => setM(m.id, np)} />
              </div>
              <div>
                <label className="label">Documento (opcional)</label>
                <input
                  className="input"
                  inputMode="numeric"
                  value={m.numeroDocumento ?? ""}
                  onChange={(e) => setM(m.id, { ...m, numeroDocumento: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
        <button type="button" className="btn-secundario w-full" onClick={() => setMiembros((xs) => [...xs, nuevaPersona(false)])}>
          + Agregar miembro
        </button>
      </Seccion>

      {/* 9–12 Acueducto */}
      <Seccion titulo="Acueducto" icono={Droplets}>
        <Campo label="9. ¿Tiene servicio de acueducto?">
          <SiNo value={v.usaAcueducto} onChange={(x) => set("usaAcueducto", x ?? false)} />
        </Campo>
        {v.usaAcueducto ? (
          <>
            <Campo label="10. ¿Tiene matrícula del derecho del acueducto?">
              <SiNo value={v.tieneMatricula} onChange={(x) => set("tieneMatricula", x)} />
            </Campo>
            {v.tieneMatricula && (
              <Campo label="11. Número de matrícula">
                <input className="input" value={v.numeroMatricula ?? ""} onChange={(e) => set("numeroMatricula", e.target.value)} />
              </Campo>
            )}
            {alquilada && (
              <div className="space-y-2 rounded-lg bg-ocre-50 p-3 ring-1 ring-ocre-100">
                <p className="font-semibold text-ocre-800">12. Casa alquilada: titular de la matrícula (nombre, cédula y teléfono)</p>
                <input
                  className="input"
                  placeholder="Nombre del titular"
                  autoCapitalize="words"
                  value={v.titularMatriculaNombre ?? ""}
                  onChange={(e) => set("titularMatriculaNombre", e.target.value)}
                />
                <input
                  className="input num"
                  placeholder="Cédula del titular"
                  inputMode="numeric"
                  value={v.titularMatriculaDocumento ?? ""}
                  onChange={(e) => set("titularMatriculaDocumento", e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Teléfono del titular"
                  inputMode="tel"
                  value={v.titularMatriculaTelefono ?? ""}
                  onChange={(e) => set("titularMatriculaTelefono", e.target.value)}
                />
              </div>
            )}
          </>
        ) : (
          <Campo label="¿De dónde toma el agua? (opcional)">
            <Select value={v.otraFuenteAgua} onChange={(x) => set("otraFuenteAgua", x)} opciones={OPC.otraFuenteAgua} />
          </Campo>
        )}
      </Seccion>

      {/* Fotos */}
      <Seccion titulo="Fotos (opcional)" icono={Camera}>
        <div className="flex flex-wrap gap-2">
          {fotos.map((f) => (
            <div key={f.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt="" className="size-24 rounded-lg object-cover" />
              <button
                type="button"
                className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-teja-600 text-white shadow"
                aria-label="Quitar foto"
                onClick={() => setFotos((xs) => xs.filter((x) => x.id !== f.id))}
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          ))}
          <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-stone-300 text-sm font-semibold text-stone-600 hover:border-marca-600 hover:text-marca-700">
            <Plus className="size-6" aria-hidden />
            Tomar foto
            <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => agregarFotos(e.target.files)} />
          </label>
        </div>
        {editando && <p className="text-sm text-stone-600">Las fotos nuevas se suman a las ya guardadas.</p>}
      </Seccion>

      {/* Autorización */}
      <Seccion titulo="Autorización de datos personales" icono={Signature}>
        <p className="text-sm text-stone-600">
          Lea a la familia: “La Junta de Acción Comunal recoge estos datos solo para la gestión comunitaria y del acueducto
          de la vereda. No se compartirán con terceros sin su permiso. Puede pedir consultarlos, corregirlos o eliminarlos en
          cualquier momento (Ley 1581 de 2012).”
        </p>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-6 w-6 accent-marca-700" checked={v.autorizacionDatos} onChange={(e) => set("autorizacionDatos", e.target.checked)} />
          <span className="font-medium">La familia autoriza el tratamiento de sus datos</span>
        </label>
        {v.autorizacionDatos && (
          <Campo label="Nombre de quien autoriza">
            <input className="input" value={v.autorizacionNombre ?? ""} onChange={(e) => set("autorizacionNombre", e.target.value)} />
            {jefe.nombres.trim() && !v.autorizacionNombre && (
              <button type="button" className="mt-1 text-sm font-semibold text-marca-700" onClick={() => set("autorizacionNombre", jefe.nombres.trim())}>
                Usar “{jefe.nombres.trim()}”
              </button>
            )}
          </Campo>
        )}
        <Campo label="Observaciones (opcional)">
          <textarea className="input" rows={2} value={v.observaciones ?? ""} onChange={(e) => set("observaciones", e.target.value)} />
        </Campo>
      </Seccion>

      {/* Barra de guardar fija abajo */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgb(26_32_28/0.08)] lg:left-64">
        <div className="mx-auto max-w-3xl">
          {error && <p className="mb-2 rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{error}</p>}
          <button className="btn-primario w-full py-3 text-base" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar vivienda"}
          </button>
        </div>
      </div>
    </div>
  );
}
