"use client";

import { Camera, ClipboardList, LocateFixed, Package, Plus, Receipt, Smartphone, Wrench, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Campo, Seccion } from "@/components/campos";
import { hoyBogota, leerPesos, pesos } from "@/lib/dinero";
import { comprimirImagen, guardarOperacion } from "@/lib/offline/sync";
import { ESTADOS_MANTENIMIENTO, PRIORIDADES, TIPOS_MANTENIMIENTO } from "@/lib/red";
import type { MantenimientoInput } from "@/lib/validacion";

type Opcion = { id: string; label: string };
type Material = { id: string; descripcion: string; cantidad: string; unidad: string; valorUnitario: string };
type Foto = { id: string; blob: Blob; url: string; tipo: "antes" | "despues" | "factura" };

function SubirFotos({ tipo, fotos, setFotos, texto }: { tipo: Foto["tipo"]; fotos: Foto[]; setFotos: (f: (x: Foto[]) => Foto[]) => void; texto: string }) {
  const mias = fotos.filter((f) => f.tipo === tipo);
  return (
    <div>
      <span className="label">{texto}</span>
      <div className="flex flex-wrap gap-2">
        {mias.map((f) => (
          <div key={f.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt="" className="size-20 rounded-lg object-cover" />
            <button
              type="button"
              className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-teja-600 text-white shadow"
              aria-label="Quitar foto"
              onClick={() => setFotos((xs) => xs.filter((x) => x.id !== f.id))}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
        <label className="flex size-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 text-sm font-semibold text-stone-600 hover:border-marca-600 hover:text-marca-700">
          <Plus className="size-5" aria-hidden />
          Foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={async (x) => {
              const files = Array.from(x.target.files ?? []);
              const nuevas = await Promise.all(
                files.map(async (f) => {
                  const blob = await comprimirImagen(f, tipo === "factura" ? 2000 : 1600);
                  return { id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob), tipo };
                }),
              );
              setFotos((xs) => [...xs, ...nuevas]);
            }}
          />
        </label>
      </div>
    </div>
  );
}

export function MantenimientoForm({
  inicial,
  predeterminado,
  elementos,
  tramos,
  vivienda,
}: {
  inicial?: MantenimientoInput;
  /** Valores precargados para un registro nuevo (p. ej. el punto desde el que se llegó). */
  predeterminado?: Partial<MantenimientoInput>;
  elementos: Opcion[];
  tramos: Opcion[];
  vivienda?: Opcion | null;
}) {
  const router = useRouter();
  const editando = Boolean(inicial);
  const hoy = hoyBogota();
  const [m, setM] = useState<MantenimientoInput>(
    () =>
      inicial ?? {
        id: crypto.randomUUID(),
        tipo: "reparacion",
        titulo: "",
        estado: "reportado",
        prioridad: "media",
        fechaReporte: hoy,
        costoManoObra: 0,
        viviendaId: vivienda?.id ?? null,
        ...predeterminado,
      },
  );
  const [materiales, setMateriales] = useState<Material[]>(() =>
    (inicial?.materiales ?? []).map((x) => ({
      id: x.id,
      descripcion: x.descripcion,
      cantidad: String(x.cantidad),
      unidad: x.unidad ?? "",
      valorUnitario: x.valorUnitario != null ? String(x.valorUnitario) : "",
    })),
  );
  const [conFactura, setConFactura] = useState(Boolean(inicial?.compra));
  const [compra, setCompra] = useState(() => ({
    id: inicial?.compra?.id ?? crypto.randomUUID(),
    proveedor: inicial?.compra?.proveedor ?? "",
    numeroFactura: inicial?.compra?.numeroFactura ?? "",
    fecha: inicial?.compra?.fecha ?? hoy,
    total: inicial?.compra?.total ? String(inicial.compra.total) : "",
  }));
  const [manoObra, setManoObra] = useState(m.costoManoObra ? String(m.costoManoObra) : "");
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();
  const [guardadoLocal, setGuardadoLocal] = useState(false);
  const set = <K extends keyof MantenimientoInput>(k: K, v: MantenimientoInput[K]) => setM((x) => ({ ...x, [k]: v }));

  const totalMateriales = materiales.reduce((a, x) => a + (Number(x.cantidad) || 0) * (leerPesos(x.valorUnitario) || 0), 0);
  const total = totalMateriales + (leerPesos(manoObra) || 0);

  const guardar = async () => {
    setError(undefined);
    if (m.titulo.trim().length < 3) return setError("Escriba qué se hizo o qué pasó.");
    if (materiales.some((x) => !x.descripcion.trim() || !(Number(x.cantidad.replace(",", ".")) > 0)))
      return setError("Revise los materiales: cada uno necesita descripción y cantidad.");
    if (conFactura && !(leerPesos(compra.total) > 0)) return setError("Escriba el total de la factura.");
    setGuardando(true);
    const payload: MantenimientoInput = {
      ...m,
      titulo: m.titulo.trim(),
      costoManoObra: leerPesos(manoObra) || 0,
      fechaEjecucion: m.estado === "terminado" && !m.fechaEjecucion ? hoy : m.fechaEjecucion,
      materiales: materiales.map((x) => ({
        id: x.id,
        descripcion: x.descripcion.trim(),
        cantidad: Number(x.cantidad.replace(",", ".")),
        unidad: x.unidad || null,
        valorUnitario: x.valorUnitario ? leerPesos(x.valorUnitario) : null,
      })),
      compra: conFactura
        ? { id: compra.id, proveedor: compra.proveedor || null, numeroFactura: compra.numeroFactura || null, fecha: compra.fecha, total: leerPesos(compra.total) }
        : null,
    };
    const r = await guardarOperacion({ id: m.id, tipo: "mantenimiento", etiqueta: `Arreglo: ${payload.titulo}`, payload }, fotos);
    setGuardando(false);
    if (r.error) return setError(`El servidor respondió: ${r.error}`);
    if (r.subido) {
      router.push(`/mantenimientos/${m.id}`);
      router.refresh();
    } else setGuardadoLocal(true);
  };

  if (guardadoLocal)
    return (
      <div className="tarjeta space-y-4 py-10 text-center">
        <Smartphone className="mx-auto size-12 text-marca-700" aria-hidden />
        <h2 className="text-xl font-bold">Guardado en el teléfono</h2>
        <p className="text-stone-600">No hay señal. El arreglo y sus fotos se subirán solos cuando vuelva la conexión.</p>
        <Link className="btn-secundario" href="/viviendas/pendientes">Ver pendientes</Link>
      </div>
    );

  return (
    <div className="space-y-4 pb-28">
      <Seccion titulo="¿Qué pasó o qué se hizo?" icono={Wrench}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Tipo">
            <select className="input" value={m.tipo} onChange={(e) => set("tipo", e.target.value as MantenimientoInput["tipo"])}>
              {Object.entries(TIPOS_MANTENIMIENTO).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Prioridad">
            <select className="input" value={m.prioridad} onChange={(e) => set("prioridad", e.target.value as "media")}>
              {Object.entries(PRIORIDADES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo label="Resumen">
          <input className="input" placeholder="Ej: Fuga en tubo de 1/2'' cerca de la escuela" value={m.titulo} onChange={(e) => set("titulo", e.target.value)} />
        </Campo>
        <Campo label="Detalle (opcional)">
          <textarea className="input" rows={3} value={m.descripcion ?? ""} onChange={(e) => set("descripcion", e.target.value)} />
        </Campo>
      </Seccion>

      <Seccion titulo="¿Dónde?" icono={LocateFixed}>
        {vivienda && <p className="font-semibold text-stone-800">Casa {vivienda.label}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Punto de la red">
            <select className="input" value={m.elementoId ?? ""} onChange={(e) => set("elementoId", e.target.value || null)}>
              <option value="">— Ninguno —</option>
              {elementos.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Tubería">
            <select className="input" value={m.tramoId ?? ""} onChange={(e) => set("tramoId", e.target.value || null)}>
              <option value="">— Ninguna —</option>
              {tramos.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </Campo>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-secundario"
            onClick={() =>
              navigator.geolocation.getCurrentPosition(
                (p) => setM((x) => ({ ...x, lat: p.coords.latitude, lng: p.coords.longitude })),
                () => setError("No se pudo obtener la ubicación"),
                { enableHighAccuracy: true, timeout: 20000 },
              )
            }
          >
            <LocateFixed className="size-5" aria-hidden />
            {m.lat ? "Actualizar ubicación" : "Guardar mi ubicación"}
          </button>
          {m.lat != null && m.lng != null && (
            <span className="num text-stone-700">
              {m.lat.toFixed(6)}, {m.lng.toFixed(6)}
            </span>
          )}
        </div>
      </Seccion>

      <Seccion titulo="Estado y fechas" icono={ClipboardList}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(ESTADOS_MANTENIMIENTO).map(([k, v]) => (
            <button
              key={k}
              type="button"
              aria-pressed={m.estado === k}
              onClick={() => set("estado", k as MantenimientoInput["estado"])}
              className={`btn border px-2 ${m.estado === k ? "border-marca-700 bg-marca-700 text-white" : "border-stone-300 bg-white text-stone-800"}`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Fecha del reporte">
            <input type="date" className="input" value={m.fechaReporte ?? ""} max={hoy} onChange={(e) => set("fechaReporte", e.target.value)} />
          </Campo>
          <Campo label="Fecha en que se arregló">
            <input type="date" className="input" value={m.fechaEjecucion ?? ""} max={hoy} onChange={(e) => set("fechaEjecucion", e.target.value)} />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Materiales y costos" icono={Package}>
        {materiales.map((x, i) => (
          <div key={x.id} className="space-y-2 rounded-lg border border-stone-200 p-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-700">Material {i + 1}</span>
              <button type="button" className="min-h-10 px-2 font-semibold text-teja-700" onClick={() => setMateriales((xs) => xs.filter((y) => y.id !== x.id))}>
                Quitar
              </button>
            </div>
            <input
              className="input"
              placeholder="Ej: Tubo PVC 1/2'' x 6 m"
              aria-label="Descripción del material"
              value={x.descripcion}
              onChange={(e) => setMateriales((xs) => xs.map((y) => (y.id === x.id ? { ...y, descripcion: e.target.value } : y)))}
            />
            <div className="grid grid-cols-3 gap-2">
              <input className="input num" inputMode="decimal" placeholder="Cant." aria-label="Cantidad" value={x.cantidad} onChange={(e) => setMateriales((xs) => xs.map((y) => (y.id === x.id ? { ...y, cantidad: e.target.value } : y)))} />
              <input className="input" placeholder="Unidad" aria-label="Unidad" value={x.unidad} onChange={(e) => setMateriales((xs) => xs.map((y) => (y.id === x.id ? { ...y, unidad: e.target.value } : y)))} />
              <input className="input num" inputMode="numeric" placeholder="$ c/u" aria-label="Valor unitario" value={x.valorUnitario} onChange={(e) => setMateriales((xs) => xs.map((y) => (y.id === x.id ? { ...y, valorUnitario: e.target.value } : y)))} />
            </div>
          </div>
        ))}
        <button
          type="button"
          className="btn-secundario w-full"
          onClick={() => setMateriales((xs) => [...xs, { id: crypto.randomUUID(), descripcion: "", cantidad: "1", unidad: "", valorUnitario: "" }])}
        >
          <Plus className="size-5" aria-hidden />
          Agregar material
        </button>
        <Campo label="Mano de obra">
          <input className="input num" inputMode="numeric" placeholder="$ 0" value={manoObra} onChange={(e) => setManoObra(e.target.value)} />
        </Campo>
        <p className="flex items-baseline justify-between border-t border-stone-200 pt-3 text-stone-700">
          Costo total del arreglo <strong className="num text-xl text-stone-900">{pesos(total)}</strong>
        </p>
      </Seccion>

      <Seccion titulo="Factura de compra" icono={Receipt}>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="size-6 accent-marca-700" checked={conFactura} onChange={(e) => setConFactura(e.target.checked)} />
          Se compraron materiales con factura
        </label>
        {conFactura && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo label="Ferretería / proveedor">
                <input className="input" value={compra.proveedor} onChange={(e) => setCompra({ ...compra, proveedor: e.target.value })} />
              </Campo>
              <Campo label="N.º de factura">
                <input className="input num" value={compra.numeroFactura} onChange={(e) => setCompra({ ...compra, numeroFactura: e.target.value })} />
              </Campo>
              <Campo label="Fecha">
                <input type="date" className="input" value={compra.fecha} max={hoy} onChange={(e) => setCompra({ ...compra, fecha: e.target.value })} />
              </Campo>
              <Campo label="Total de la factura">
                <input className="input num" inputMode="numeric" placeholder="$ 0" value={compra.total} onChange={(e) => setCompra({ ...compra, total: e.target.value })} />
              </Campo>
            </div>
            <SubirFotos tipo="factura" fotos={fotos} setFotos={setFotos} texto="Foto de la factura" />
          </>
        )}
      </Seccion>

      <Seccion titulo="Fotos del arreglo" icono={Camera}>
        <SubirFotos tipo="antes" fotos={fotos} setFotos={setFotos} texto="Antes" />
        <SubirFotos tipo="despues" fotos={fotos} setFotos={setFotos} texto="Después" />
        {editando && <p className="text-sm text-stone-600">Las fotos nuevas se suman a las ya guardadas.</p>}
      </Seccion>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgb(26_32_28/0.08)] lg:left-64">
        <div className="mx-auto max-w-3xl">
          {error && <p className="mb-2 rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{error}</p>}
          <button className="btn-primario w-full py-3 text-base" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar arreglo"}
          </button>
        </div>
      </div>
    </div>
  );
}
