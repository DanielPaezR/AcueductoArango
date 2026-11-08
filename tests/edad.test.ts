import { describe, expect, it } from "vitest";
import { edad, edadPersona } from "@/lib/opciones";

describe("edad", () => {
  const hoy = new Date(2026, 10, 8); // 8 nov 2026
  it("calcula por fecha de nacimiento", () => {
    expect(edad("1975-04-12", hoy)).toBe(51);
    expect(edad("2012-11-09", hoy)).toBe(13); // cumple mañana
    expect(edad("2012-11-08", hoy)).toBe(14); // cumple hoy
    expect(edad(null, hoy)).toBeNull();
  });
  it("usa la edad reportada en la visita y la actualiza con el tiempo", () => {
    expect(edadPersona({ edadReportada: 8, edadReportadaEn: "2025-01-15" })).toBeGreaterThanOrEqual(9);
    expect(edadPersona({ edadReportada: 62 })).toBe(62);
    expect(edadPersona({})).toBeNull();
  });
  it("prefiere la fecha de nacimiento cuando existe", () => {
    expect(edadPersona({ fechaNacimiento: "2000-01-01", edadReportada: 99 })).not.toBe(99);
  });
});
