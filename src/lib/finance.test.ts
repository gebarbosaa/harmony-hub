import { describe, expect, it } from "vitest";
import { calculateInstallmentValue, fromCents, splitAmountIntoInstallmentCents, toCents } from "./finance";

describe("money helpers", () => {
  it("converts BRL values to integer cents and back", () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(fromCents(1999)).toBe(19.99);
  });

  it("keeps the full total when splitting installments with a remainder", () => {
    const installments = splitAmountIntoInstallmentCents(10000, 3);
    expect(installments).toEqual([3333, 3333, 3334]);
    expect(installments.reduce((sum, value) => sum + value, 0)).toBe(10000);
  });

  it("supports totals smaller than the number of installments", () => {
    expect(splitAmountIntoInstallmentCents(2, 4)).toEqual([0, 0, 0, 2]);
  });

  it("supports one installment and zero total", () => {
    expect(splitAmountIntoInstallmentCents(1250, 1)).toEqual([1250]);
    expect(splitAmountIntoInstallmentCents(0, 3)).toEqual([0, 0, 0]);
  });

  it("rejects invalid cents and installment counts", () => {
    expect(() => splitAmountIntoInstallmentCents(1.5, 2)).toThrow(RangeError);
    expect(() => splitAmountIntoInstallmentCents(-1, 2)).toThrow(RangeError);
    expect(() => splitAmountIntoInstallmentCents(100, 0)).toThrow(RangeError);
    expect(() => splitAmountIntoInstallmentCents(100, 1.5)).toThrow(RangeError);
  });

  it("keeps the legacy installment helper compatible", () => {
    expect(calculateInstallmentValue(90, 3)).toBe(30);
    expect(calculateInstallmentValue(90, 0)).toBe(0);
  });
});
