import { describe, it, expect } from "vitest";
import { cents, decimal, split } from "./money";
describe("importes financieros", () => {
  it("evita aritmética flotante", () =>
    expect(decimal(cents("0.10") + cents("0.20"))).toBe("0.30"));
  it("conserva igualdad personal y reserva el centavo impar", () =>
    expect(split("17700.01")).toEqual({ each: "8850.00", reserve: "0.01" }));
  it("rechaza precisión ambigua", () => expect(() => cents("1.005")).toThrow());
  it("maneja importes grandes sin perder centavos", () =>
    expect(decimal(cents("9999999999999.99"))).toBe("9999999999999.99"));
});
