import { describe, expect, it } from "vitest";
import { syncViviendaSchema, mantenimientoSchema } from "@/lib/validacion";

const id = "6f1e2c4a-1b2c-4d5e-8f90-123456789abc";

describe("validación", () => {
  it("acepta una visita mínima y convierte vacíos a null", () => {
    const r = syncViviendaSchema.parse({
      vivienda: { id, lat: 6.4, lng: -75.26, referencia: "", autorizacionDatos: true, autorizacionMedio: "verbal", autorizacionNombre: "Rosa" },
      personas: [{ id, nombres: "Rosa", fechaNacimiento: "", edadReportada: 62 }],
    });
    expect(r.vivienda.referencia).toBeNull();
    expect(r.personas[0].fechaNacimiento).toBeNull();
    expect(r.vivienda.estado).toBe("habitada");
  });
  it("rechaza personas sin nombre y coordenadas imposibles", () => {
    expect(() => syncViviendaSchema.parse({ vivienda: { id, lat: 6.4, lng: -75.26 }, personas: [{ id, nombres: " " }] })).toThrow();
    expect(() => syncViviendaSchema.parse({ vivienda: { id, lat: 200, lng: -75.26 }, personas: [] })).toThrow();
  });
  it("valida arreglos con materiales", () => {
    const m = mantenimientoSchema.parse({
      id,
      tipo: "reparacion",
      titulo: "Fuga",
      materiales: [{ id, descripcion: "Unión PVC", cantidad: 2, valorUnitario: 8500 }],
    });
    expect(m.estado).toBe("reportado");
    expect(() => mantenimientoSchema.parse({ id, tipo: "reparacion", titulo: "Fuga", materiales: [{ id, descripcion: "x", cantidad: 0 }] })).toThrow();
  });
});
