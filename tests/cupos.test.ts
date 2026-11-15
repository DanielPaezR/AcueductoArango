import { describe, expect, it } from "vitest";
import { repartoEquitativo, sumaCupos } from "@/lib/cupos";

describe("reparto de familias entre veredas", () => {
  it("reparte por igual y el sobrante de a uno", () => {
    expect(repartoEquitativo(10, [1, 2, 3])).toEqual({ 1: 4, 2: 3, 3: 3 });
    expect(sumaCupos(repartoEquitativo(101, [5, 6, 7, 8]))).toBe(101);
  });
  it("sin veredas o sin familias, todo en cero", () => {
    expect(repartoEquitativo(0, [1, 2])).toEqual({ 1: 0, 2: 0 });
    expect(repartoEquitativo(5, [])).toEqual({});
  });
});
