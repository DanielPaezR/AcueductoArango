/**
 * Datos legales. Cada Junta (vereda) es responsable del tratamiento de los datos que recoge; sus datos se
 * llenan en la ficha de la vereda (módulo de la alcaldía). Las variables JAC_* de Railway quedan como
 * respaldo para la primera vereda. Lo que falte se muestra como "[pendiente]" para que sea evidente.
 */
const v = (nombre: string, defecto = "[pendiente: configurar en Railway]") => process.env[nombre]?.trim() || defecto;

export function datosResponsable() {
  return {
    nombre: v("JAC_NOMBRE", "la Junta de Acción Comunal de cada vereda"),
    municipio: v("JAC_MUNICIPIO", "Concepción, Antioquia"),
    nit: v("JAC_NIT"),
    personeriaJuridica: v("JAC_PERSONERIA"),
    direccion: v("JAC_DIRECCION"),
    correo: v("JAC_CORREO"),
    telefono: v("JAC_TELEFONO"),
    /** Cargo que atiende consultas y reclamos sobre datos personales. */
    responsableAtencion: v("JAC_RESPONSABLE_DATOS", "Presidencia de la Junta"),
  };
}

/** Plataforma (alcaldía) y municipio: aparecen en el login, el menú de la alcaldía y los textos legales. */
export const PLATAFORMA = {
  nombre: process.env.NOMBRE_PLATAFORMA?.trim() || "Veredas de Concepción",
  alcaldia: process.env.NOMBRE_ALCALDIA?.trim() || "Alcaldía de Concepción",
  municipio: process.env.JAC_MUNICIPIO?.trim() || "Concepción, Antioquia",
};

export type Responsable = ReturnType<typeof datosResponsable>;

/** Datos de la Junta de una vereda (de su ficha; si faltan, de las variables JAC_*). */
export function responsableDe(vereda: {
  nombre: string;
  nombreJac?: string | null;
  nit?: string | null;
  personeriaJuridica?: string | null;
  direccion?: string | null;
  email?: string | null;
  telefono?: string | null;
  municipio?: string | null;
  departamento?: string | null;
} | null): Responsable {
  const base = datosResponsable();
  if (!vereda) return base;
  return {
    nombre: vereda.nombreJac || `Junta de Acción Comunal de la vereda ${vereda.nombre}`,
    municipio: vereda.municipio ? `${vereda.municipio}, ${vereda.departamento ?? "Antioquia"}` : base.municipio,
    nit: vereda.nit || base.nit,
    personeriaJuridica: vereda.personeriaJuridica || base.personeriaJuridica,
    direccion: vereda.direccion || base.direccion,
    correo: vereda.email || base.correo,
    telefono: vereda.telefono || base.telefono,
    responsableAtencion: base.responsableAtencion,
  };
}

/** Cambiar estas versiones obliga a volver a aceptar (usuarios) y queda registrada en cada autorización. */
/** 2.0: los datos se comparten con la alcaldía (consulta municipal y programas de ayuda). */
export const VERSION_POLITICA = "2.0-2026-11";
/** ¿Esa versión de la autorización incluye compartir los datos con la alcaldía? */
export const autorizaAlcaldia = (version: string | null | undefined) => Boolean(version && Number(version.split(".")[0]) >= 2);
export const VERSION_TERMINOS = "1.0-2026-11";
export const VIGENCIA = "15 de noviembre de 2026";

/** Texto corto que se lee a la familia en cada visita (aviso de privacidad, Decreto 1377 de 2013, art. 14). */
export function avisoVisita(responsable = datosResponsable().nombre) {
  return [
    `${responsable} recoge estos datos para el censo de la vereda, la prestación y el cobro del servicio de acueducto, la entrega de ayudas y la gestión comunitaria.`,
    "Responder es voluntario. Si hay menores de edad en la casa, usted como su representante autoriza sus datos, que solo se usan en su beneficio.",
    "La pregunta sobre discapacidad es un dato sensible: no está obligado a responderla. Si responde, se usa solo para conocer la población y priorizar ayudas, y nunca se publica.",
    `Los datos se comparten con la ${PLATAFORMA.alcaldia}, que los usa para conocer la población de las veredas y para sus programas y ayudas; la alcaldía tampoco los publica.`,
    "Los datos se guardan en servidores de proveedores en el exterior (Estados Unidos) con medidas de seguridad, y no se venden ni se entregan a terceros sin su permiso, salvo orden de autoridad.",
    "Usted puede conocer, corregir, actualizar o pedir que se borren sus datos, y revocar este permiso, ante la presidencia de la Junta. La política completa está en la página /privacidad.",
  ];
}
