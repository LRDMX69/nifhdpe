import { describe, it, expect } from "vitest";
import { calculateNigerianSalary } from "@/lib/payroll";

describe("calculateNigerianSalary", () => {
  it("splits gross into basic/housing/transport using the given ratios", () => {
    const r = calculateNigerianSalary(500_000);
    expect(r.basic).toBeCloseTo(250_000, 2);
    expect(r.housing).toBeCloseTo(150_000, 2);
    expect(r.transport).toBeCloseTo(100_000, 2);
    expect(r.grossPay).toBe(500_000);
    // basic + housing + transport must equal gross (otherAllowances = 0)
    expect(r.basic + r.housing + r.transport + r.otherAllowances).toBeCloseTo(500_000, 2);
  });

  it("charges 8% employee and 10% employer pension on the pension base", () => {
    const r = calculateNigerianSalary(500_000);
    // pension base = basic + housing + transport = gross
    expect(r.pensionEmployee).toBeCloseTo(500_000 * 0.08, 2);
    expect(r.pensionEmployer).toBeCloseTo(500_000 * 0.10, 2);
  });

  it("charges NHF at 2.5% of basic", () => {
    const r = calculateNigerianSalary(500_000);
    expect(r.nhf).toBeCloseTo(250_000 * 0.025, 2);
  });

  it("never produces a negative net pay or negative tax", () => {
    for (const gross of [0, 50_000, 100_000, 300_000, 1_000_000, 10_000_000]) {
      const r = calculateNigerianSalary(gross);
      expect(r.paye).toBeGreaterThanOrEqual(0);
      expect(r.netPay).toBeGreaterThanOrEqual(0);
      expect(r.netPay).toBeLessThanOrEqual(gross);
    }
  });

  it("applies the progressive PAYE bands exactly as defined", () => {
    // Monthly 100k => annual 1.2m. CRA = max(200k, 1% of gross) + 20% of gross
    // = 200k + 240k = 440k. Deduct annual pension (8% of gross) + NHF (2.5% of
    // basic) => taxable 649k, which crosses three bands:
    //   300k @ 7% + 300k @ 11% + 49k @ 15% = 61,350/yr => 5,112.50/month.
    const r = calculateNigerianSalary(100_000);
    expect(r.paye).toBeCloseTo(5_112.5, 2);
  });

  it("stays within the first band for a low income", () => {
    // Monthly 30k => annual 360k. CRA = max(200k, 3.6k) + 72k = 272k.
    // Deduct pension (28.8k) + NHF (0.45k) => taxable ~58.75k, all at 7%.
    const r = calculateNigerianSalary(30_000);
    const annualGross = 30_000 * 12;
    const pensionEmployee = 30_000 * 0.08;
    const nhf = (30_000 * 0.5) * 0.025;
    const cra = Math.max(200_000, 0.01 * annualGross) + 0.2 * annualGross;
    const annualTaxable = Math.max(0, annualGross - cra - pensionEmployee * 12 - nhf * 12);
    const expected = (annualTaxable * 0.07) / 12;
    expect(r.paye).toBeCloseTo(expected, 2);
  });

  it("produces a consistent gross = pension + nhf + paye + net identity", () => {
    const r = calculateNigerianSalary(750_000);
    const sum = r.pensionEmployee + r.nhf + r.paye + r.netPay;
    expect(sum).toBeCloseTo(r.grossPay, 2);
  });
});
