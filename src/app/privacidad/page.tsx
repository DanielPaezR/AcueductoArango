import { PaginaLegal } from "@/components/pagina-legal";
import { datosResponsable, VERSION_POLITICA, VIGENCIA } from "@/lib/legal";

export const metadata = {
  title: "Política de tratamiento de datos personales",
  description: "Cómo la JAC de la vereda Arango recoge, usa y protege los datos personales (Ley 1581 de 2012).",
};

export default function Privacidad() {
  const r = datosResponsable();
  return (
    <PaginaLegal titulo="Política de tratamiento de datos personales" version={VERSION_POLITICA} vigencia={VIGENCIA}>
      <p>
        Esta política explica cómo la <strong>{r.nombre}</strong> recoge, guarda, usa y protege los datos personales de las familias de la vereda,
        de los usuarios del acueducto y de las personas que usan el sistema de información JAC Arango. Se expide en cumplimiento de los artículos 15
        y 20 de la Constitución Política, la Ley Estatutaria 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto Único 1074 de 2015) y
        demás normas que los modifiquen o complementen.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li><strong>Nombre:</strong> {r.nombre}</li>
        <li><strong>NIT:</strong> {r.nit}</li>
        <li><strong>Personería jurídica:</strong> {r.personeriaJuridica}</li>
        <li><strong>Domicilio:</strong> {r.direccion}, {r.municipio}</li>
        <li><strong>Correo electrónico:</strong> {r.correo}</li>
        <li><strong>Teléfono / WhatsApp:</strong> {r.telefono}</li>
        <li><strong>Área que atiende consultas y reclamos:</strong> {r.responsableAtencion}</li>
      </ul>

      <h2>2. Definiciones</h2>
      <p>
        Para esta política se usan las definiciones del artículo 3 de la Ley 1581 de 2012. En particular: <strong>titular</strong> es la persona
        cuyos datos se tratan; <strong>tratamiento</strong> es cualquier operación sobre los datos (recoger, guardar, usar, circular o suprimir);
        <strong> responsable</strong> es la Junta, que decide sobre los datos; y <strong>encargado</strong> es quien trata datos por cuenta de la Junta
        (por ejemplo, los proveedores de servidores).
      </p>

      <h2>3. Datos que recogemos</h2>
      <ul>
        <li>
          <strong>Censo de viviendas (visita casa a casa):</strong> nombre, edad, número de cédula y teléfono de la cabeza de familia; nombre, edad y,
          si se da, documento de los demás miembros; nombre del predio o referencia; si la casa es propia o alquilada; principal sustento; si tiene
          servicio y matrícula del acueducto; y, si la casa es alquilada, nombre, cédula y teléfono del titular de la matrícula.
        </li>
        <li><strong>Ubicación de la vivienda:</strong> coordenadas GPS y fotografías de la fachada, si la familia lo permite.</li>
        <li><strong>Acueducto:</strong> número de matrícula, cobros, pagos, saldos y estado del servicio de cada suscriptor.</li>
        <li><strong>Ayudas y proyectos:</strong> qué ayudas recibió o en qué actividades participó cada hogar.</li>
        <li><strong>Autorización:</strong> nombre y cédula de quien autoriza, fecha, medio (firma o de palabra) y, si firma, la imagen de la firma.</li>
        <li>
          <strong>Usuarios del sistema</strong> (directivos, encuestadores, fontanero, tesorería): nombre, usuario, teléfono, cargo, fechas de
          ingreso y las acciones que realizan en el sistema (bitácora), incluida la dirección IP de los intentos de ingreso fallidos.
        </li>
        <li>
          <strong>Página pública:</strong> cuando alguien consulta un estado de cuenta, no guardamos la cédula consultada; solo registramos que hubo
          una consulta y si encontró resultados.
        </li>
      </ul>
      <p>
        <strong>No pedimos datos sensibles</strong> (salud, origen étnico, orientación política o religiosa, datos biométricos, etc.). Si en algún
        caso fuera necesario, se le informará que es <strong>voluntario</strong> responder y se pedirá autorización expresa (Ley 1581, arts. 5 y 6).
      </p>

      <h2>4. Para qué usamos los datos (finalidades)</h2>
      <ol>
        <li>Conocer quién vive en la vereda y dónde, para la planeación y gestión comunitaria de la Junta.</li>
        <li>Prestar, mantener y cobrar el servicio de acueducto comunitario; llevar el estado de cuenta de cada suscriptor y contactarlo sobre cobros, cortes, daños y reparaciones.</li>
        <li>Organizar la entrega de ayudas, la participación en proyectos y las convocatorias de la Junta.</li>
        <li>Elaborar estadísticas e informes agregados (sin identificar personas) para la asamblea, la Alcaldía u otras entidades.</li>
        <li>Rendir cuentas a la comunidad: la página pública de transparencia muestra cifras agregadas y, en la consulta por cédula, solo el nombre abreviado, la matrícula y el estado de pago del titular.</li>
        <li>Cumplir obligaciones legales, contables y requerimientos de autoridades competentes.</li>
        <li>Garantizar la seguridad del sistema y la trazabilidad de las acciones de sus usuarios.</li>
      </ol>
      <p>Los datos no se venden, no se usan con fines comerciales ni políticos y no se entregan a terceros sin autorización, salvo los casos que permite la ley.</p>

      <h2>5. Datos de niñas, niños y adolescentes</h2>
      <p>
        Los datos de menores de edad (nombre, edad y documento si se da) se tratan solo para las finalidades anteriores, respetando su interés
        superior y sus derechos fundamentales (Ley 1581, art. 7). La autorización la da su padre, madre o representante legal. Nunca se publican.
      </p>

      <h2>6. Autorización</h2>
      <p>
        Antes de registrar los datos de una familia, el encuestador lee el aviso de privacidad y pide la autorización. Esta se da por escrito
        (firma en el celular) o de palabra; en este último caso el sistema deja constancia de quién la recibió, la fecha, la hora y la versión de
        esta política (Decreto 1377 de 2013, art. 7). Si la familia no autoriza, solo se registra la ubicación de la casa, sin datos de personas.
      </p>

      <h2>7. Derechos de los titulares</h2>
      <p>Usted tiene derecho a (Ley 1581, art. 8):</p>
      <ul>
        <li>Conocer, actualizar y rectificar sus datos.</li>
        <li>Pedir prueba de la autorización que dio.</li>
        <li>Ser informado sobre el uso que se ha dado a sus datos.</li>
        <li>Revocar la autorización y pedir que se borren sus datos, cuando no exista un deber legal o contractual de conservarlos.</li>
        <li>Acceder gratis a sus datos.</li>
        <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC), después de haber agotado el trámite ante la Junta.</li>
      </ul>

      <h2>8. Cómo hacer consultas y reclamos</h2>
      <p>
        Escriba al correo <strong>{r.correo}</strong>, por WhatsApp al <strong>{r.telefono}</strong>, o preséntese ante la {r.responsableAtencion}.
        Indique su nombre, cédula, lo que pide y cómo le respondemos.
      </p>
      <ul>
        <li>
          <strong>Consultas</strong> (saber qué datos tenemos): se responden en máximo <strong>10 días hábiles</strong>, prorrogables por 5 días
          hábiles más avisándole el motivo (Ley 1581, art. 14).
        </li>
        <li>
          <strong>Reclamos</strong> (corregir, actualizar, borrar o revocar): se responden en máximo <strong>15 días hábiles</strong>, prorrogables por
          8 días hábiles más avisándole el motivo. Si el reclamo está incompleto, se le pedirá completarlo dentro de los 5 días siguientes (Ley 1581,
          art. 15).
        </li>
      </ul>
      <p>
        Cuando se pide borrar los datos, la Junta suprime nombres, documentos, teléfonos, edades, fotos y firma. Se conserva la ubicación de la
        casa y la información del servicio y los pagos del acueducto que la Junta está obligada a guardar por razones contables y del servicio.
      </p>

      <h2>9. Dónde se guardan los datos y quién los trata</h2>
      <p>
        Los datos se guardan en servidores de proveedores de servicios en la nube que actúan como <strong>encargados</strong>: Railway (base de
        datos y aplicación) y Cloudinary (fotografías y firmas), ubicados en los Estados Unidos. Esto constituye una <strong>transmisión
        internacional</strong> de datos a encargados, que se autoriza al aceptar esta política (Decreto 1377 de 2013, arts. 24 y 25). Estos
        proveedores aplican medidas de seguridad y solo tratan los datos para prestar su servicio a la Junta.
      </p>

      <h2>10. Seguridad</h2>
      <ul>
        <li>Acceso solo con usuario y contraseña; cada usuario ve únicamente las secciones que necesita según su función.</li>
        <li>Conexión cifrada (HTTPS), contraseñas guardadas cifradas y bloqueo temporal ante intentos repetidos de ingreso.</li>
        <li>Registro permanente de quién crea, modifica o consulta información (bitácora).</li>
        <li>Las firmas se guardan como archivos privados que solo se pueden ver con un enlace temporal.</li>
        <li>Los usuarios del sistema aceptan un compromiso de confidencialidad antes de ingresar.</li>
        <li>Copias de seguridad periódicas, guardadas por la Junta en un lugar seguro.</li>
      </ul>

      <h2>11. Tiempo de conservación</h2>
      <p>
        Los datos se conservan mientras la familia viva en la vereda o sea usuaria del acueducto, y después por el tiempo que exijan las normas
        contables, tributarias o de servicios públicos aplicables. Cumplido ese plazo, o cuando el titular lo pida y no exista deber de
        conservarlos, se suprimen.
      </p>

      <h2>12. Página pública de transparencia</h2>
      <p>
        La información del dinero del acueducto es de interés de la comunidad. Por eso se publican el saldo, los ingresos y gastos con sus
        soportes y el cargo (no el nombre) de quien los registró y aprobó, y cifras agregadas de pagos (cuántas casas están al día o atrasadas,
        sin decir cuáles). La consulta por cédula muestra solo el nombre abreviado, la matrícula y el estado de pago, y está limitada para evitar
        abusos. En los soportes de gastos no se deben incluir datos personales de usuarios.
      </p>

      <h2>13. Cambios a esta política</h2>
      <p>
        Cualquier cambio importante se informará en esta página y en la asamblea de la Junta antes de aplicarse. Si cambian las finalidades, se
        pedirá una nueva autorización.
      </p>
    </PaginaLegal>
  );
}
