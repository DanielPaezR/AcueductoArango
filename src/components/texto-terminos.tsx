import { datosResponsable } from "@/lib/legal";

/** Compromiso que aceptan los usuarios internos (también se muestra en /terminos). */
export function CompromisoUsuarios() {
  const r = datosResponsable();
  return (
    <>
      <h2>Compromiso de los usuarios del sistema</h2>
      <p>
        Quien recibe un usuario de JAC Arango (directivos, encuestadores, fontanero, tesorería u otros) actúa por cuenta de la {r.nombre} y se
        compromete a:
      </p>
      <ol>
        <li>Usar el sistema y los datos <strong>solo</strong> para las funciones que le asignó la Junta y para las finalidades de la Política de datos personales.</li>
        <li>
          Guardar <strong>confidencialidad</strong> sobre los datos de las familias, incluso después de terminar su labor: no copiarlos, fotografiarlos,
          reenviarlos, publicarlos ni comentarlos con personas no autorizadas.
        </li>
        <li>No compartir su usuario ni su contraseña, y cerrar sesión en celulares o computadores que no sean suyos.</li>
        <li>Leer el aviso de privacidad a cada familia y registrar sus datos solo si autoriza; nunca inventar ni modificar datos sin soporte.</li>
        <li>Registrar el dinero con honestidad y con sus soportes; los movimientos quedan publicados para la comunidad.</li>
        <li>Avisar de inmediato a la presidencia si pierde el celular, sospecha que alguien usó su cuenta o detecta un error o un uso indebido.</li>
        <li>No descargar reportes ni respaldos salvo que su función lo requiera, y guardarlos en un lugar seguro.</li>
      </ol>
      <p>
        Todas las acciones quedan registradas en la bitácora. El incumplimiento puede llevar a retirar el acceso y a las acciones disciplinarias
        previstas en los estatutos de la Junta y en la ley, incluidas las sanciones de la Ley 1581 de 2012 y del Código Penal (Ley 1273 de 2009,
        delitos informáticos).
      </p>
    </>
  );
}
