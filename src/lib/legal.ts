/**
 * Datos legales de la Junta. Se configuran como variables en Railway (sin tocar el código).
 * Mientras no se configuren, se muestran como "[pendiente]" para que sea evidente que faltan.
 */
const v = (nombre: string, defecto = "[pendiente: configurar en Railway]") => process.env[nombre]?.trim() || defecto;

export function datosResponsable() {
  return {
    nombre: v("JAC_NOMBRE", "Junta de Acción Comunal de la vereda Arango"),
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

/** Cambiar estas versiones obliga a volver a aceptar (usuarios) y queda registrada en cada autorización. */
export const VERSION_POLITICA = "1.0-2026-11";
export const VERSION_TERMINOS = "1.0-2026-11";
export const VIGENCIA = "8 de noviembre de 2026";

/** Texto corto que se lee a la familia en cada visita (aviso de privacidad, Decreto 1377 de 2013, art. 14). */
export function avisoVisita(responsable = datosResponsable().nombre) {
  return [
    `${responsable} recoge estos datos para el censo de la vereda, la prestación y el cobro del servicio de acueducto, la entrega de ayudas y la gestión comunitaria.`,
    "Responder es voluntario. Si hay menores de edad en la casa, usted como su representante autoriza sus datos, que solo se usan en su beneficio.",
    "Los datos se guardan en servidores de proveedores en el exterior (Estados Unidos) con medidas de seguridad, y no se venden ni se entregan a terceros sin su permiso, salvo orden de autoridad.",
    "Usted puede conocer, corregir, actualizar o pedir que se borren sus datos, y revocar este permiso, ante la presidencia de la Junta. La política completa está en la página /privacidad.",
  ];
}
