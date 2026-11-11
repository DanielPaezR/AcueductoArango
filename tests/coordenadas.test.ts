import { describe, expect, it } from "vitest";
import { kmAlMunicipio, leerNumero, leerPar } from "@/lib/coordenadas";

describe("coordenadas escritas a mano", () => {
  it("lee números con coma o punto", () => {
    expect(leerNumero("6,39412")).toBe(6.39412);
    expect(leerNumero(" -75.26231 ")).toBe(-75.26231);
    expect(leerNumero("6.39.1")).toBeNull();
    expect(leerNumero("")).toBeNull();
  });
  it("lee pares pegados de Google Maps y otros", () => {
    expect(leerPar("6.39412, -75.26231")).toEqual([6.39412, -75.26231]);
    expect(leerPar("6,39412; -75,26231")).toEqual([6.39412, -75.26231]);
    expect(leerPar("6.39412 -75.26231")).toEqual([6.39412, -75.26231]);
    expect(leerPar("https://www.google.com/maps/@6.39412,-75.26231,17z")).toEqual([6.39412, -75.26231]);
    const g = leerPar(`6°23'38.8"N 75°15'44.3"W`)!;
    expect(g[0]).toBeCloseTo(6.39411, 4);
    expect(g[1]).toBeCloseTo(-75.26231, 4);
    expect(leerPar("6.39412")).toBeNull();
  });
  it("detecta puntos lejos de Concepción (p. ej. longitud sin el menos)", () => {
    expect(kmAlMunicipio([6.39412, -75.26231])).toBeLessThan(2);
    expect(kmAlMunicipio([6.39412, 75.26231])).toBeGreaterThan(1000);
  });
});
