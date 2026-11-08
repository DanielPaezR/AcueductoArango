import { describe, expect, it } from "vitest";
import { fechaCorta, leerPesos, pesos } from "@/lib/dinero";

describe("dinero", () => {
  it("lee valores escritos como en Colombia", () => {
    expect(leerPesos("25.000")).toBe(25000);
    expect(leerPesos("$ 2.500.000")).toBe(2500000);
    expect(leerPesos("15000")).toBe(15000);
    expect(leerPesos("")).toBe(0);
    expect(leerPesos(null)).toBe(0);
  });
  it("formatea pesos sin decimales", () => {
    expect(pesos(2445000).replace(/\s/g, " ")).toBe("$ 2.445.000");
    expect(pesos("30000.00").replace(/\s/g, " ")).toBe("$ 30.000");
  });
  it("muestra fechas cortas en español", () => {
    expect(fechaCorta("2026-11-08")).toBe("8 nov 2026");
    expect(fechaCorta(null)).toBe("");
  });
});
