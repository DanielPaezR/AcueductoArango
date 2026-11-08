import { PaginaLegal } from "@/components/pagina-legal";
import { CompromisoUsuarios } from "@/components/texto-terminos";
import { datosResponsable, VERSION_TERMINOS, VIGENCIA } from "@/lib/legal";

export const metadata = { title: "Términos y condiciones de uso", description: "Condiciones de uso del sistema JAC Arango y de su página pública." };

export default function Terminos() {
  const r = datosResponsable();
  return (
    <PaginaLegal titulo="Términos y condiciones de uso" version={VERSION_TERMINOS} vigencia={VIGENCIA}>
      <p>
        JAC Arango es el sistema de información de la <strong>{r.nombre}</strong> ({r.municipio}) para el censo de la vereda, la gestión del
        acueducto comunitario, sus cobros y su tesorería. Al usar el sistema o su página pública usted acepta estos términos.
      </p>

      <h2>1. Quién puede usarlo</h2>
      <ul>
        <li>
          <strong>Página pública</strong> (/transparencia): cualquier persona. Permite ver las cuentas del acueducto y que cada suscriptor consulte
          su propio estado de cuenta con su cédula.
        </li>
        <li>
          <strong>Sistema interno</strong>: solo personas a quienes la Junta les entregue un usuario, con permisos según su función. El acceso es
          personal e intransferible y la Junta puede retirarlo en cualquier momento.
        </li>
      </ul>

      <h2>2. Uso permitido de la página pública</h2>
      <ul>
        <li>Consulte solo su propio estado de cuenta o el de alguien que se lo haya pedido.</li>
        <li>No intente adivinar cédulas, extraer información de forma masiva ni afectar el funcionamiento del sitio. Las consultas están limitadas y quedan registradas.</li>
        <li>La información pública tiene fines de transparencia; no la use para hostigar, cobrar por cuenta propia o exponer a ningún vecino.</li>
      </ul>

      <h2>3. Información publicada</h2>
      <p>
        Las cifras se calculan con lo que registra la tesorería de la Junta y se actualizan en tiempo real. Pueden existir pagos o gastos aún no
        registrados o pendientes de aprobación. Ante cualquier diferencia, el soporte válido es el recibo o la factura física y el acta de la
        Junta. Si encuentra un error, infórmelo a la {r.responsableAtencion}.
      </p>

      <h2>4. Datos personales</h2>
      <p>
        El tratamiento de datos personales se rige por la <a href="/privacidad" className="font-semibold text-marca-700 underline">Política de tratamiento de datos personales</a>,
        que hace parte de estos términos.
      </p>

      <CompromisoUsuarios />

      <h2>Disponibilidad y responsabilidad</h2>
      <p>
        La Junta procura que el sistema funcione de forma continua, pero puede haber interrupciones por mantenimiento, fallas de los proveedores o
        falta de señal. El modo sin conexión guarda la información en el celular hasta que haya señal; el usuario debe sincronizarla y no borrar
        los datos del navegador mientras haya registros pendientes.
      </p>

      <h2>Cambios</h2>
      <p>
        La Junta puede actualizar estos términos. Los usuarios del sistema deberán aceptar la nueva versión antes de seguir usándolo.
      </p>

      <h2>Contacto</h2>
      <p>
        {r.nombre} · {r.direccion}, {r.municipio} · {r.correo} · {r.telefono}
      </p>
    </PaginaLegal>
  );
}
