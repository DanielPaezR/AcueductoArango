import { describe, expect, it } from "vitest";
import { longitudMetros, svgElemento } from "@/lib/red";

describe("red del acueducto", () => {
  it("mide tuberías en metros (haversine)", () => {
    expect(longitudMetros([[6.4, -75.26]])).toBe(0);
    // 0.001° de latitud ≈ 111 m
    expect(longitudMetros([[6.4, -75.26], [6.401, -75.26]])).toBeGreaterThan(108);
    expect(longitudMetros([[6.4, -75.26], [6.401, -75.26]])).toBeLessThan(114);
  });
  it("dibuja la forma según el tipo y el color según el estado", () => {
    expect(svgElemento("bocatoma", "operativo")).toContain("<path");
    expect(svgElemento("tanque_almacenamiento", "con_falla")).toContain("<rect");
    expect(svgElemento("tanque_almacenamiento", "con_falla")).toContain("#c48a1c");
    expect(svgElemento("desconocido", "x")).toContain("<circle");
  });
});
