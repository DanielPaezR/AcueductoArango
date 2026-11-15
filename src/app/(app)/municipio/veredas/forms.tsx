"use client";

import { useActionState } from "react";
import { crearUsuarioDeVereda, crearVereda, editarVereda, restablecerPasswordDeVereda } from "@/actions/municipio";

type V = {
  id: number;
  nombre: string;
  nombreJac: string | null;
  nit: string | null;
  personeriaJuridica: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  metaViviendas: number;
  lat: number | null;
  lng: number | null;
  activa: boolean;
};

function CamposVereda({ v, acueducto }: { v?: Partial<V> & Record<string, unknown>; acueducto?: boolean }) {
  const t = (k: keyof V) => (v?.[k] as string | number | null | undefined) ?? "";
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="nombre">Nombre de la vereda</label>
          <input id="nombre" name="nombre" className="input" defaultValue={t("nombre")} required />
        </div>
        <div>
          <label className="label" htmlFor="metaViviendas">Viviendas aproximadas (meta del censo)</label>
          <input id="metaViviendas" name="metaViviendas" className="input num" inputMode="numeric" defaultValue={t("metaViviendas") || 100} required />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="nombreJac">Nombre legal de la Junta (opcional)</label>
          <input id="nombreJac" name="nombreJac" className="input" placeholder="Junta de Acción Comunal de la vereda …" defaultValue={t("nombreJac")} />
          <p className="mt-1 text-sm text-stone-600">Aparece como responsable de los datos en la política de privacidad y en los libros impresos.</p>
        </div>
        <div>
          <label className="label" htmlFor="nit">NIT</label>
          <input id="nit" name="nit" className="input num" defaultValue={t("nit")} />
        </div>
        <div>
          <label className="label" htmlFor="personeriaJuridica">Personería jurídica</label>
          <input id="personeriaJuridica" name="personeriaJuridica" className="input" defaultValue={t("personeriaJuridica")} />
        </div>
        <div>
          <label className="label" htmlFor="telefono">Teléfono de la Junta</label>
          <input id="telefono" name="telefono" className="input" inputMode="tel" defaultValue={t("telefono")} />
        </div>
        <div>
          <label className="label" htmlFor="email">Correo de la Junta</label>
          <input id="email" name="email" className="input" type="email" defaultValue={t("email")} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="direccion">Dirección o punto de atención</label>
          <input id="direccion" name="direccion" className="input" defaultValue={t("direccion")} />
        </div>
        <div>
          <label className="label" htmlFor="lat">Latitud del centro (opcional)</label>
          <input id="lat" name="lat" className="input num" inputMode="decimal" placeholder="6.39" defaultValue={t("lat")} />
        </div>
        <div>
          <label className="label" htmlFor="lng">Longitud del centro (opcional)</label>
          <input id="lng" name="lng" className="input num" placeholder="-75.26" defaultValue={t("lng")} />
        </div>
      </div>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="acueducto" defaultChecked={acueducto} className="mt-0.5 size-6 accent-marca-700" />
        <span>
          <span className="font-semibold">La Junta administra un acueducto veredal</span>
          <span className="block text-sm text-stone-600">Activa la red, los suscriptores, los cobros y la tesorería del acueducto para esta vereda.</span>
        </span>
      </label>
    </>
  );
}

export function NuevaVeredaForm() {
  const [estado, accion, pendiente] = useActionState(crearVereda, undefined);
  const v = estado?.valores ?? {};
  return (
    <form action={accion} className="space-y-6" key={JSON.stringify(v)}>
      <section className="tarjeta space-y-4">
        <h2 className="text-lg font-bold">La vereda</h2>
        <CamposVereda v={v as Record<string, unknown>} acueducto={v.acueducto === "on"} />
      </section>
      <section className="tarjeta space-y-3">
        <h2 className="text-lg font-bold">Presidente(a) de la Junta</h2>
        <p className="text-stone-600">Con este usuario la presidencia entra y crea a su tesorería, encuestadores y fiscal.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="presNombre">Nombre completo</label>
            <input id="presNombre" name="presNombre" className="input" defaultValue={v.presNombre} required />
          </div>
          <div>
            <label className="label" htmlFor="presUsuario">Usuario para entrar</label>
            <input id="presUsuario" name="presUsuario" className="input" autoCapitalize="none" placeholder="ej: maria.lopez" defaultValue={v.presUsuario} required />
          </div>
          <div>
            <label className="label" htmlFor="presTelefono">Teléfono</label>
            <input id="presTelefono" name="presTelefono" className="input" inputMode="tel" defaultValue={v.presTelefono} />
          </div>
          <div>
            <label className="label" htmlFor="presCargo">Cargo</label>
            <input id="presCargo" name="presCargo" className="input" placeholder="Presidenta / Presidente" defaultValue={v.presCargo} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="password">Contraseña temporal</label>
            <input id="password" name="password" className="input" minLength={8} required />
            <p className="mt-1 text-sm text-stone-600">Debe cambiarla la primera vez que entre.</p>
          </div>
        </div>
      </section>
      {estado?.error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{estado.error}</p>}
      <button className="btn-primario min-h-14 w-full text-lg" disabled={pendiente}>{pendiente ? "Creando…" : "Crear vereda y presidente(a)"}</button>
    </form>
  );
}

export function EditarVeredaForm({ v, acueducto }: { v: V; acueducto: boolean }) {
  const [estado, accion, pendiente] = useActionState(editarVereda, undefined);
  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="id" value={v.id} />
      <CamposVereda v={v} acueducto={acueducto} />
      <label className="flex items-center gap-3">
        <input type="checkbox" name="activa" defaultChecked={v.activa} className="size-6 accent-marca-700" />
        <span className="font-semibold">Vereda activa (aparece en el tablero y en la página pública)</span>
      </label>
      {estado?.error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{estado.error}</p>}
      {estado?.ok && <p className="rounded-lg bg-marca-50 px-3 py-2.5 text-marca-800" role="status">{estado.ok}</p>}
      <button className="btn-primario" disabled={pendiente}>Guardar cambios</button>
    </form>
  );
}

export function UsuarioVeredaForm({ veredaId }: { veredaId: number }) {
  const [estado, accion, pendiente] = useActionState(crearUsuarioDeVereda, undefined);
  const v = estado?.valores ?? {};
  return (
    <form action={accion} className="space-y-3" key={estado?.ok ?? JSON.stringify(v)}>
      <input type="hidden" name="veredaId" value={veredaId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="u-nombre">Nombre completo</label>
          <input id="u-nombre" name="nombre" className="input" defaultValue={v.nombre} required />
        </div>
        <div>
          <label className="label" htmlFor="u-usuario">Usuario</label>
          <input id="u-usuario" name="username" className="input" autoCapitalize="none" defaultValue={v.username} required />
        </div>
        <div>
          <label className="label" htmlFor="u-rol">Rol</label>
          <select id="u-rol" name="rol" className="input" defaultValue={v.rol ?? "admin"}>
            <option value="admin">Presidencia</option>
            <option value="tesorero">Tesorería</option>
            <option value="encuestador">Encuestador</option>
            <option value="consulta">Fiscal / veedor (consulta)</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="u-cargo">Cargo</label>
          <input id="u-cargo" name="cargo" className="input" defaultValue={v.cargo} />
        </div>
        <div>
          <label className="label" htmlFor="u-tel">Teléfono</label>
          <input id="u-tel" name="telefono" className="input" inputMode="tel" defaultValue={v.telefono} />
        </div>
        <div>
          <label className="label" htmlFor="u-pass">Contraseña temporal</label>
          <input id="u-pass" name="password" className="input" minLength={8} required />
        </div>
      </div>
      {estado?.error && <p className="rounded-lg bg-teja-50 px-3 py-2.5 text-teja-700" role="alert">{estado.error}</p>}
      {estado?.ok && <p className="rounded-lg bg-marca-50 px-3 py-2.5 text-marca-800" role="status">{estado.ok}</p>}
      <button className="btn-secundario" disabled={pendiente}>Crear usuario</button>
    </form>
  );
}

export function ClaveVeredaForm({ id }: { id: string }) {
  const [estado, accion, pendiente] = useActionState(restablecerPasswordDeVereda, undefined);
  return (
    <form action={accion} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input name="password" className="input min-h-10 w-44 py-1.5" placeholder="Nueva clave temporal" minLength={8} required aria-label="Nueva contraseña temporal" />
      <button className="btn-secundario min-h-10 px-3 py-1.5" disabled={pendiente}>Asignar</button>
      {estado?.error && <span className="text-sm text-teja-700">{estado.error}</span>}
      {estado?.ok && <span className="text-sm text-marca-800">{estado.ok}</span>}
    </form>
  );
}
