import { describe, expect, it } from "vitest";
import { crearLimite } from "@/lib/limite";

describe("límite de intentos", () => {
  it("bloquea al pasar el máximo y se limpia", () => {
    const l = crearLimite(3, 60_000);
    for (let i = 0; i < 3; i++) {
      expect(l.bloqueado("ana")).toBe(false);
      l.registrar("ana");
    }
    expect(l.bloqueado("ana")).toBe(true);
    expect(l.bloqueado("otro")).toBe(false);
    l.limpiar("ana");
    expect(l.bloqueado("ana")).toBe(false);
  });
});
