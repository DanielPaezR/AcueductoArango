"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MapaSelector } from "@/components/mapa/dinamicos";
import { dbLocal } from "@/lib/offline/db";
import { comprimirImagen, sincronizar } from "@/lib/offline/sync";
import { edad, OPC } from "@/lib/opciones";
import type { PersonaInput, ViviendaInput } from "@/lib/validacion";

type Sector = { id: number; nombre: string };
type Vivienda = Omit<ViviendaInput, "lat" | "lng"> & { lat: number | null; lng: number | null };

const nuevaPersona = (jefe = false): PersonaInput => ({
  id: crypto.randomUUID(),
  nombres: "",
  esJefeHogar: jefe,
  parentesco: jefe ? "Jefe(a) de hogar" : null,
  discapacidad: false,
  afiliadoJac: false,
});

const viviendaVacia = (): Vivienda => ({
  id: crypto.randomUUID(),
  lat: null,
  lng: null,
  usaAcueducto: false,
  autorizacionDatos: false,
  ubicacionAjustada: false,
  estado: "habitada",
});

/* ---------- pequeños componentes de campo ---------- */

function Campo({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  opciones,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  opciones: readonly string[];
}) {
  return (
    <select className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">—</option>
      {opciones.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function SiNo({ value, onChange }: { value: boolean | null | undefined; onChange: (v: boolean | null) => void }) {
  return (
    <div className="flex gap-1">
      {([
        [true, "Sí"],
        [false, "No"],
      ] as const).map(([v, l]) => (
        <button
          type="button"
          key={l}
          onClick={() => onChange(value === v ? null : v)}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
            value === v ? "border-marca-700 bg-marca-700 text-white" : "border-stone-300 bg-white text-stone-700"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="tarjeta space-y-3">
      <h2 className="font-semibold text-stone-800">{titulo}</h2>
      {children}
    </section>
  );
}

/* ---------- GPS ---------- */

function useGps() {
  const [estado, setEstado] = useState<"inactivo" | "buscando" | "listo" | "error">("inactivo");
  const [lectura, setLectura] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string>();
  const watch = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detener = () => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    if (timer.current) clearTimeout(timer.current);
    watch.current = null;
  };

  /** Escucha el GPS hasta 30 s (o hasta tener ≤ 6 m) y se queda con la lectura más precisa. */
  const iniciar = (onMejor: (p: GeolocationPosition) => void) => {
    if (!("geolocation" in navigator)) {
      setEstado("error");
      setError("Este dispositivo no tiene GPS disponible");
      return;
    }
    detener();
    setEstado("buscando");
    setError(undefined);
    let mejor: GeolocationPosition | null = null;
    watch.current = navigator.geolocation.watchPosition(
      (p) => {
        if (!mejor || p.coords.accuracy < mejor.coords.accuracy) {
          mejor = p;
          setLectura(p);
          onMejor(p);
        }
        if (p.coords.accuracy <= 6) {
          detener();
          setEstado("listo");
        }
      },
      (e) => {
        detener();
        setEstado(mejor ? "listo" : "error");
        setError(e.code === 1 ? "Debes permitir el acceso a la ubicación" : "No se pudo obtener la ubicación. Intenta al aire libre.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 },
    );
    timer.current = setTimeout(() => {
      detener();
      setEstado(mejor ? "listo" : "error");
      if (!mejor) setError("No se obtuvo señal GPS. Intenta al aire libre.");
    }, 30000);
  };

  useEffect(() => detener, []);
  return { estado, lectura, error, iniciar, detener: () => (detener(), setEstado(lectura ? "listo" : "inactivo")) };
}

/* ---------- persona ---------- */

function PersonaCard({
  p,
  i,
  onChange,
  onEliminar,
}: {
  p: PersonaInput;
  i: number;
  onChange: (p: PersonaInput) => void;
  onEliminar: () => void;
}) {
  const [abierta, setAbierta] = useState(!p.nombres);
  const [mas, setMas] = useState(false);
  const set = <K extends keyof PersonaInput>(k: K, v: PersonaInput[K]) => onChange({ ...p, [k]: v });
  const e = edad(p.fechaNacimiento ?? null);

  if (!abierta)
    return (
      <button type="button" onClick={() => setAbierta(true)} className="flex w-full items-center gap-3 rounded-lg border border-stone-200 p-3 text-left">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-marca-100 font-bold text-marca-800">{i + 1}</span>
        <span className="flex-1">
          <span className="block font-medium">
            {p.nombres} {p.apellidos} {p.esJefeHogar && <span className="ml-1 rounded bg-marca-100 px-1.5 text-xs text-marca-800">Jefe(a)</span>}
          </span>
          <span className="text-sm text-stone-500">
            {[p.parentesco, e !== null ? `${e} años` : null, p.numeroDocumento].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="text-stone-400">Editar</span>
      </button>
    );

  return (
    <div className="space-y-3 rounded-lg border border-marca-600/40 bg-marca-50/40 p-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Persona {i + 1}</span>
        <button type="button" onClick={onEliminar} className="text-sm text-red-700">Quitar</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Nombres *">
          <input className="input" value={p.nombres} onChange={(e) => set("nombres", e.target.value)} autoCapitalize="words" />
        </Campo>
        <Campo label="Apellidos">
          <input className="input" value={p.apellidos ?? ""} onChange={(e) => set("apellidos", e.target.value)} autoCapitalize="words" />
        </Campo>
        <Campo label="Tipo de documento">
          <Select value={p.tipoDocumento} onChange={(v) => set("tipoDocumento", v)} opciones={OPC.tipoDocumento} />
        </Campo>
        <Campo label="Número de documento">
          <input className="input" inputMode="numeric" value={p.numeroDocumento ?? ""} onChange={(e) => set("numeroDocumento", e.target.value)} />
        </Campo>
        <Campo label={`Fecha de nacimiento${e !== null ? ` (${e} años)` : ""}`}>
          <input type="date" className="input" value={p.fechaNacimiento ?? ""} onChange={(e) => set("fechaNacimiento", e.target.value)} />
        </Campo>
        <Campo label="Sexo">
          <Select value={p.sexo} onChange={(v) => set("sexo", v)} opciones={OPC.sexo} />
        </Campo>
        <Campo label="Parentesco con el jefe(a) de hogar">
          <Select
            value={p.parentesco}
            onChange={(v) => onChange({ ...p, parentesco: v, esJefeHogar: v === "Jefe(a) de hogar" })}
            opciones={OPC.parentesco}
          />
        </Campo>
        <Campo label="Teléfono">
          <input className="input" inputMode="tel" value={p.telefono ?? ""} onChange={(e) => set("telefono", e.target.value)} />
        </Campo>
      </div>

      <button type="button" className="text-sm font-semibold text-marca-700" onClick={() => setMas(!mas)}>
        {mas ? "▲ Menos datos" : "▼ Más datos (estudio, salud, etc.)"}
      </button>
      {mas && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Escolaridad">
            <Select value={p.escolaridad} onChange={(v) => set("escolaridad", v)} opciones={OPC.escolaridad} />
          </Campo>
          <Campo label="¿Estudia actualmente?">
            <SiNo value={p.estudiaActualmente} onChange={(v) => set("estudiaActualmente", v)} />
          </Campo>
          <Campo label="Ocupación">
            <input className="input" value={p.ocupacion ?? ""} onChange={(e) => set("ocupacion", e.target.value)} />
          </Campo>
          <Campo label="Régimen de salud">
            <Select value={p.regimenSalud} onChange={(v) => set("regimenSalud", v)} opciones={OPC.regimenSalud} />
          </Campo>
          <Campo label="EPS">
            <input className="input" value={p.eps ?? ""} onChange={(e) => set("eps", e.target.value)} />
          </Campo>
          <Campo label="Grupo SISBÉN (ej. B3)">
            <input className="input uppercase" maxLength={10} value={p.sisbenGrupo ?? ""} onChange={(e) => set("sisbenGrupo", e.target.value.toUpperCase())} />
          </Campo>
          <Campo label="¿Tiene alguna discapacidad?">
            <SiNo value={p.discapacidad} onChange={(v) => set("discapacidad", v ?? false)} />
          </Campo>
          {p.discapacidad && (
            <Campo label="¿Cuál?">
              <input className="input" value={p.tipoDiscapacidad ?? ""} onChange={(e) => set("tipoDiscapacidad", e.target.value)} />
            </Campo>
          )}
          <Campo label="Grupo étnico">
            <Select value={p.grupoEtnico} onChange={(v) => set("grupoEtnico", v)} opciones={OPC.grupoEtnico} />
          </Campo>
          <Campo label="¿Víctima del conflicto armado?">
            <SiNo value={p.victimaConflicto} onChange={(v) => set("victimaConflicto", v)} />
          </Campo>
          <Campo label="¿Afiliado(a) a la JAC?">
            <SiNo value={p.afiliadoJac} onChange={(v) => set("afiliadoJac", v ?? false)} />
          </Campo>
          <Campo label="Observaciones" className="sm:col-span-2">
            <textarea className="input" rows={2} value={p.observaciones ?? ""} onChange={(e) => set("observaciones", e.target.value)} />
          </Campo>
        </div>
      )}
      <button
        type="button"
        className="btn-secundario w-full"
        onClick={() => (p.nombres.trim() ? setAbierta(false) : alert("Escribe al menos los nombres"))}
      >
        Listo
      </button>
    </div>
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
  const [personas, setPersonas] = useState<PersonaInput[]>(() => inicial?.personas ?? [nuevaPersona(true)]);
  const [fotos, setFotos] = useState<{ id: string; blob: Blob; url: string }[]>([]);
  const [verMapa, setVerMapa] = useState(editando);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();
  const [guardadaLocal, setGuardadaLocal] = useState(false);
  const gps = useGps();

  const set = <K extends keyof Vivienda>(k: K, val: Vivienda[K]) => setV((x) => ({ ...x, [k]: val }));
  const pos: [number, number] | null = v.lat !== null && v.lng !== null ? [v.lat, v.lng] : null;

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
    setPersonas([nuevaPersona(true)]);
    fotos.forEach((f) => URL.revokeObjectURL(f.url));
    setFotos([]);
    setGuardadaLocal(false);
    setError(undefined);
    window.scrollTo({ top: 0 });
    tomarGps();
  };

  const guardar = async () => {
    setError(undefined);
    if (!pos) return setError("Falta la ubicación: usa el GPS o marca la casa en el mapa.");
    const conNombre = personas.filter((p) => p.nombres.trim());
    if (conNombre.length !== personas.length) return setError("Hay personas sin nombre: complétalas o quítalas.");
    if (conNombre.length && !v.autorizacionDatos)
      return setError("Para registrar datos de las personas se necesita la autorización de tratamiento de datos.");
    if (v.autorizacionDatos && !v.autorizacionNombre?.trim())
      return setError("Escribe el nombre de quien autoriza el tratamiento de datos.");

    setGuardando(true);
    gps.detener();
    const payload = { vivienda: { ...v, lat: pos[0], lng: pos[1] }, personas };
    const jefe = personas.find((p) => p.esJefeHogar) ?? personas[0];
    try {
      await dbLocal.transaction("rw", dbLocal.viviendas, dbLocal.fotos, async () => {
        await dbLocal.viviendas.put({
          id: v.id,
          payload,
          etiqueta: jefe ? `${jefe.nombres} ${jefe.apellidos ?? ""}`.trim() : v.referencia || "Vivienda sin familia",
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
        <div className="text-5xl">📲</div>
        <h2 className="text-xl font-bold">Guardada en el teléfono</h2>
        <p className="text-stone-600">
          No hay señal en este momento. La vivienda se subirá sola cuando vuelva la conexión (o desde “Pendientes”).
        </p>
        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
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
    <div className="space-y-4 pb-24">
      {/* Ubicación */}
      <Seccion titulo="📍 Ubicación">
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
            <span className="font-mono">{pos[0].toFixed(6)}, {pos[1].toFixed(6)}</span>
            {v.precisionM != null && !v.ubicacionAjustada && (
              <span
                className={`ml-2 rounded px-1.5 py-0.5 text-xs font-semibold ${
                  v.precisionM <= 10 ? "bg-marca-100 text-marca-800" : v.precisionM <= 25 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                }`}
              >
                ± {Math.round(v.precisionM)} m
              </span>
            )}
            {v.ubicacionAjustada && <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800">Ajustada en el mapa</span>}
            {v.altitudM != null && <span className="ml-2 text-stone-500">{v.altitudM} m s.n.m.</span>}
          </div>
        ) : (
          <p className="text-sm text-stone-500">Párate frente a la casa y toma la ubicación.</p>
        )}
        {gps.estado === "buscando" && gps.lectura && (
          <p className="text-xs text-stone-500">Mejorando precisión… espera unos segundos para un punto más exacto.</p>
        )}
        {gps.error && <p className="text-sm text-red-700">{gps.error}</p>}
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
            <p className="text-xs text-stone-500">
              Toca el mapa o arrastra la casita para corregir el punto. (Sin señal el mapa puede verse vacío; el GPS sí funciona.)
            </p>
          </>
        )}
        <Campo label="Referencia para llegar">
          <input className="input" placeholder="Ej: después de la escuela, portón verde" value={v.referencia ?? ""} onChange={(e) => set("referencia", e.target.value)} />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Sector">
            <select className="input" value={v.sectorId ?? ""} onChange={(e) => set("sectorId", e.target.value ? Number(e.target.value) : null)}>
              <option value="">—</option>
              {sectores.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Nombre del predio / finca">
            <input className="input" value={v.nombrePredio ?? ""} onChange={(e) => set("nombrePredio", e.target.value)} />
          </Campo>
        </div>
      </Seccion>

      {/* Agua */}
      <Seccion titulo="💧 Agua">
        <label className="flex items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 p-3">
          <input type="checkbox" className="h-6 w-6 accent-sky-600" checked={v.usaAcueducto} onChange={(e) => set("usaAcueducto", e.target.checked)} />
          <span className="font-semibold text-sky-900">Esta vivienda usa el acueducto de la vereda</span>
        </label>
        {!v.usaAcueducto && (
          <Campo label="¿De dónde toma el agua?">
            <Select value={v.otraFuenteAgua} onChange={(x) => set("otraFuenteAgua", x)} opciones={OPC.otraFuenteAgua} />
          </Campo>
        )}
      </Seccion>

      {/* Familia */}
      <Seccion titulo={`👨‍👩‍👧 Familia (${personas.length})`}>
        <div className="space-y-2">
          {personas.map((p, i) => (
            <PersonaCard
              key={p.id}
              p={p}
              i={i}
              onChange={(np) => setPersonas((xs) => xs.map((x) => (x.id === np.id ? np : np.esJefeHogar ? { ...x, esJefeHogar: false } : x)))}
              onEliminar={() => confirm("¿Quitar esta persona?") && setPersonas((xs) => xs.filter((x) => x.id !== p.id))}
            />
          ))}
        </div>
        <button type="button" className="btn-secundario w-full" onClick={() => setPersonas((xs) => [...xs, nuevaPersona(xs.length === 0)])}>
          + Agregar persona
        </button>
      </Seccion>

      {/* Vivienda */}
      <Seccion titulo="🏠 La vivienda">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Estado">
            <select className="input" value={v.estado} onChange={(e) => set("estado", e.target.value as Vivienda["estado"])}>
              <option value="habitada">Habitada</option>
              <option value="deshabitada">Deshabitada</option>
              <option value="en_construccion">En construcción</option>
              <option value="demolida">Demolida</option>
            </select>
          </Campo>
          <Campo label="Tenencia">
            <Select value={v.tenencia} onChange={(x) => set("tenencia", x)} opciones={OPC.tenencia} />
          </Campo>
          <Campo label="Material de paredes">
            <Select value={v.materialParedes} onChange={(x) => set("materialParedes", x)} opciones={OPC.materialParedes} />
          </Campo>
          <Campo label="Material del piso">
            <Select value={v.materialPiso} onChange={(x) => set("materialPiso", x)} opciones={OPC.materialPiso} />
          </Campo>
          <Campo label="Número de cuartos">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              className="input"
              value={v.numCuartos ?? ""}
              onChange={(e) => set("numCuartos", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Campo>
          <Campo label="¿Tiene energía eléctrica?">
            <SiNo value={v.energia} onChange={(x) => set("energia", x)} />
          </Campo>
          <Campo label="Cocina con">
            <Select value={v.gas} onChange={(x) => set("gas", x)} opciones={OPC.gas} />
          </Campo>
          <Campo label="¿Tiene internet?">
            <SiNo value={v.internet} onChange={(x) => set("internet", x)} />
          </Campo>
          <Campo label="Señal de celular">
            <Select value={v.senalCelular} onChange={(x) => set("senalCelular", x)} opciones={OPC.senalCelular} />
          </Campo>
          <Campo label="Aguas residuales">
            <Select value={v.saneamiento} onChange={(x) => set("saneamiento", x)} opciones={OPC.saneamiento} />
          </Campo>
          <Campo label="Manejo de basuras">
            <Select value={v.manejoBasuras} onChange={(x) => set("manejoBasuras", x)} opciones={OPC.manejoBasuras} />
          </Campo>
          <Campo label="Actividad económica">
            <input className="input" placeholder="Café, ganadería, jornal…" value={v.actividadEconomica ?? ""} onChange={(e) => set("actividadEconomica", e.target.value)} />
          </Campo>
        </div>
      </Seccion>

      {/* Fotos */}
      <Seccion titulo="📷 Fotos">
        <div className="flex flex-wrap gap-2">
          {fotos.map((f) => (
            <div key={f.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt="" className="h-24 w-24 rounded-lg object-cover" />
              <button
                type="button"
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-600 text-xs text-white"
                onClick={() => setFotos((xs) => xs.filter((x) => x.id !== f.id))}
              >
                ✕
              </button>
            </div>
          ))}
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 text-xs text-stone-500">
            <span className="text-2xl">＋</span>Foto
            <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => agregarFotos(e.target.files)} />
          </label>
        </div>
        {editando && <p className="text-xs text-stone-500">Las fotos que agregues aquí se suman a las ya guardadas.</p>}
      </Seccion>

      {/* Autorización */}
      <Seccion titulo="✍️ Autorización de datos personales">
        <p className="text-sm text-stone-600">
          Lea al jefe(a) de hogar: “La Junta de Acción Comunal recoge estos datos solo para la gestión comunitaria y del acueducto
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
          </Campo>
        )}
        <Campo label="Observaciones generales">
          <textarea className="input" rows={3} value={v.observaciones ?? ""} onChange={(e) => set("observaciones", e.target.value)} />
        </Campo>
      </Seccion>

      {/* Barra de guardar fija abajo */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 p-3 backdrop-blur lg:left-64">
        <div className="mx-auto max-w-3xl">
          {error && <p className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          <button className="btn-primario w-full py-3 text-base" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar vivienda"}
          </button>
        </div>
      </div>
    </div>
  );
}
