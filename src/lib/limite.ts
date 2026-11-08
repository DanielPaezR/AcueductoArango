import "server-only";

/**
 * Límite de intentos en memoria (la app corre en una sola instancia en Railway).
 * Cuenta intentos por clave dentro de una ventana; al pasar el máximo bloquea hasta que la ventana expire.
 */
export function crearLimite(maximo: number, ventanaMs: number) {
  const registros = new Map<string, number[]>();
  return {
    bloqueado(clave: string) {
      const ahora = Date.now();
      const lista = (registros.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
      registros.set(clave, lista);
      return lista.length >= maximo;
    },
    registrar(clave: string) {
      const lista = registros.get(clave) ?? [];
      lista.push(Date.now());
      registros.set(clave, lista);
      if (registros.size > 10000) registros.clear();
    },
    limpiar(clave: string) {
      registros.delete(clave);
    },
  };
}
