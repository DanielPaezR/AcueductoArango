"use client";

import { useActionState, useTransition } from "react";
import { agregarBeneficiarioMunicipal, cambiarEstadoProyectoMunicipal, crearProyectoMunicipal, quitarBeneficiarioMunicipal } from "@/actions/municipio";
import { TIPOS_PROYECTO } from "@/lib/ayudas";

export function NuevoProyectoForm() {
  const [estado, accion, pendiente] = useActionState(crearProyectoMunicipal, undefined);
  return (
    <form action={accion} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="nombre">Nombre del proyecto o ayuda</label>
          <input id="nombre" name="nombre" className="input" placeholder="Ej: Kits escolares 2027, Mercados adulto mayor" required />
        </div>
        <div>
          <label className="label" htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" className="input" defaultValue="ayuda">
            {Object.entries(TIPOS_PROYECTO).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="entidad">Dependencia o entidad</label>
          <input id="entidad" name="entidad" className="input" placeholder="Ej: Secretaría de Desarrollo Social" />
        </div>
        <div>
          <label className="label" htmlFor="fechaInicio">Desde</label>
          <input id="fechaInicio" name="fechaInicio" type="date" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="fechaFin">Hasta</label>
          <input id="fechaFin" name="fechaFin" type="date" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="descripcion">Descripción y criterios</label>
          <textarea id="descripcion" name="descripcion" rows={2} className="input" placeholder="A quién va dirigido, qué se entrega…" />
        </div>
      </div>
      {estado?.error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{estado.error}</p>}
      <button className="btn-primario" disabled={pendiente}>Crear proyecto</button>
    </form>
  );
}

export function BeneficiarioForm({ proyectoId, hoy, familias }: { proyectoId: string; hoy: string; familias: { id: string; label: string }[] }) {
  const [estado, accion, pendiente] = useActionState(agregarBeneficiarioMunicipal, undefined);
  return (
    <form action={accion} className="space-y-3" key={estado?.ok}>
      <input type="hidden" name="proyectoId" value={proyectoId} />
      <div>
        <label className="label" htmlFor="viviendaId">Familia</label>
        <select id="viviendaId" name="viviendaId" className="input" required defaultValue="">
          <option value="" disabled>
            {familias.length ? "Elija la familia…" : "Busque primero la familia"}
          </option>
          {familias.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="label" htmlFor="fecha">Fecha</label>
          <input id="fecha" name="fecha" type="date" className="input" defaultValue={hoy} required />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="detalle">Qué recibió</label>
          <input id="detalle" name="detalle" className="input" placeholder="Ej: Mercado #1, kit escolar" />
        </div>
        <div>
          <label className="label" htmlFor="valorEstimado">Valor</label>
          <input id="valorEstimado" name="valorEstimado" className="input num" inputMode="numeric" placeholder="$ 0" />
        </div>
      </div>
      <input type="hidden" name="cantidad" value="" />
      {estado?.error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{estado.error}</p>}
      {estado?.ok && <p className="rounded-lg bg-marca-50 px-3 py-2.5 text-marca-800" role="status">{estado.ok}</p>}
      <button className="btn-primario" disabled={pendiente || !familias.length}>Registrar beneficiaria</button>
    </form>
  );
}

export function EstadoProyectoBotones({ id, estado }: { id: string; estado: string }) {
  const [pendiente, start] = useTransition();
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {estado !== "activo" && <button className="btn-secundario" disabled={pendiente} onClick={() => start(() => cambiarEstadoProyectoMunicipal(id, "activo"))}>Reabrir</button>}
      {estado === "activo" && (
        <>
          <button className="btn-secundario" disabled={pendiente} onClick={() => start(() => cambiarEstadoProyectoMunicipal(id, "terminado"))}>Marcar terminado</button>
          <button className="btn-secundario" disabled={pendiente} onClick={() => confirm("¿Cancelar el proyecto?") && start(() => cambiarEstadoProyectoMunicipal(id, "cancelado"))}>Cancelar</button>
        </>
      )}
    </div>
  );
}

export function QuitarBeneficiario({ id }: { id: string }) {
  const [pendiente, start] = useTransition();
  return (
    <button className="text-sm font-semibold text-teja-700 hover:underline" disabled={pendiente} onClick={() => confirm("¿Quitar este registro?") && start(() => quitarBeneficiarioMunicipal(id))}>
      Quitar
    </button>
  );
}
