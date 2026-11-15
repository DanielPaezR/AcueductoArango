/**
 * Reparte `total` familias entre veredas por partes iguales. Lo que sobra de la división se asigna
 * de a una, en el orden recibido (p. ej. alfabético), para que la suma sea exactamente `total`.
 */
export function repartoEquitativo(total: number, veredas: number[]): Record<number, number> {
  const n = veredas.length;
  if (!n || total <= 0) return Object.fromEntries(veredas.map((v) => [v, 0]));
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return Object.fromEntries(veredas.map((v, i) => [v, base + (i < resto ? 1 : 0)]));
}

/** Lee los cupos manuales del formulario (campos `cupo_<veredaId>`). */
export function cuposDelFormulario(form: FormData, veredas: number[]): Record<number, number> {
  return Object.fromEntries(veredas.map((v) => [v, Math.max(0, Math.floor(Number(form.get(`cupo_${v}`) ?? 0)) || 0)]));
}

export const sumaCupos = (c: Record<number, number>) => Object.values(c).reduce((a, x) => a + x, 0);
