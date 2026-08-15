import { describe, expect, it } from "vitest";
import { calculateExpensePaymentStatus, calculateInvoiceTotals, calculateLoanBalance, calculateOutstandingBalance, calculateQuotationTotals, calculateReconciliationDifference, calculateReceivablesFromAging, calculateVatSchedule, formatClientDocumentNumber } from "@/lib/financialMath";

describe("financial business calculations", () => {
  it("calculates quotation subtotal, margin, discount, overhead, VAT, and grand total deterministically", () => {
    const totals = calculateQuotationTotals({
      items: [{ quantity: 10, unitPrice: 1234.567 }, { quantity: 2.5, unitPrice: 1000 }],
      laborUnits: 10,
      laborRate: 500,
      transportCost: 50_000,
      profitMarginPercent: 15,
      discountAmount: 1_000,
      overheadAmount: 2_000,
      taxRatePercent: 7.5,
    });
    expect(totals.subtotal).toBe(14_845.67);
    expect(totals.laborTotal).toBe(5_000);
    expect(totals.profitAmount).toBe(10_476.85);
    expect(totals.discount).toBe(1_000);
    expect(totals.taxAmount).toBe(6_099.19);
    expect(totals.grandTotal).toBe(87_421.71);
  });

  it("caps discounts at the commercial total and never creates a negative taxable total", () => {
    const totals = calculateQuotationTotals({ items: [{ quantity: 1, unitPrice: 100 }], laborUnits: 0, laborRate: 0, transportCost: 0, profitMarginPercent: 0, discountAmount: 10_000, overheadAmount: 0, taxRatePercent: 7.5 });
    expect(totals.discount).toBe(100);
    expect(totals.taxableTotal).toBe(0);
    expect(totals.grandTotal).toBe(0);
  });

  it("calculates outstanding balances without overpayment or floating-point drift", () => {
    expect(calculateOutstandingBalance(100.1, [33.3, 33.3, 33.3])).toBe(0.2);
    expect(calculateOutstandingBalance(100, [60, 60])).toBe(0);
  });

  it("calculates VAT payable and VAT credit from traceable inputs", () => {
    const schedule = calculateVatSchedule({ grossAmount: 100_000, outputVat: 7_500, inputVat: 2_000, vatWithheld: 500, vatPaid: 1_000, penalty: 100, interest: 50, broughtForward: 300, lrp: 200 });
    expect(schedule.netAmount).toBe(99_500);
    expect(schedule.totalCreditPayable).toBe(3_650);
    expect(schedule.vatPayable).toBe(3_650);
    expect(schedule.vatCredit).toBe(0);
  });

  it("calculates partial invoice payments and prevents overpayment", () => {
    expect(calculateOutstandingBalance(100_000, [30_000, 20_000])).toBe(50_000);
    expect(calculateOutstandingBalance(100_000, [120_000])).toBe(0);
  });

  it("calculates loan balance after multiple repayments", () => {
    expect(calculateLoanBalance(500_000, 0, [50_000, 50_000, 50_000])).toBe(350_000);
  });

  it("calculates the complete VAT schedule with payable and credit paths", () => {
    const payable = calculateVatSchedule({ grossAmount: 250_000, outputVat: 18_750, inputVat: 5_000, vatWithheld: 1_250, vatPaid: 2_000, penalty: 250, interest: 125, broughtForward: 500, lrp: 250 });
    expect(payable.netAmount).toBe(248_750);
    expect(payable.totalCreditPayable).toBe(10_125);
    expect(payable.vatPayable).toBe(10_125);
    expect(payable.vatCredit).toBe(0);

    const credit = calculateVatSchedule({ grossAmount: 100_000, outputVat: 1_000, inputVat: 5_000, vatWithheld: 0, vatPaid: 0, penalty: 0, interest: 0, broughtForward: 0, lrp: 0 });
    expect(credit.totalCreditPayable).toBe(-4_000);
    expect(credit.vatPayable).toBe(0);
    expect(credit.vatCredit).toBe(4_000);
  });

  it("derives expense payment status from outstanding and part payment", () => {
    expect(calculateExpensePaymentStatus(50_000, 20_000)).toBe("partially_paid");
    expect(calculateExpensePaymentStatus(50_000, 0)).toBe("unpaid");
    expect(calculateExpensePaymentStatus(0, 50_000)).toBe("paid");
  });

  it("calculates reconciliation and loan balances from signed records", () => {
    expect(calculateReconciliationDifference(1_000.1, 1_000.3)).toBe(0.2);
    expect(calculateLoanBalance(100_000, 20_000, [10_000, 15_000, 5_000])).toBe(90_000);
    expect(calculateLoanBalance(100_000, 0, [150_000])).toBe(0);
  });

  it("keeps a client's document family contiguous with alphabetic suffixes", () => {
    expect(formatClientDocumentNumber("INVOICES/2026/0027", 1)).toBe("INVOICES/2026/0027");
    expect(formatClientDocumentNumber("INVOICES/2026/0027", 2)).toBe("INVOICES/2026/0027B");
    expect(formatClientDocumentNumber("INVOICES/2026/0027", 3)).toBe("INVOICES/2026/0027C");
    expect(formatClientDocumentNumber("INVOICES/2026/0027", 28)).toBe("INVOICES/2026/0027AB");
  });

  it("sums current receivables from server aging buckets without period-cash distortion", () => {
    expect(calculateReceivablesFromAging({ current: 120_000, "1_30": 30_000, "31_60": 0, "61_90": null, "90_plus": -10 })).toBe(150_000);
  });

  it("calculates complete invoice gross, net, VAT, WHT, and balance inputs deterministically", () => {
    const totals = calculateInvoiceTotals({
      items: [{ quantity: 10, unitPrice: 12_345.67, discountAmount: 100 }],
      discountAmount: 500,
      overheadAmount: 2_000,
      transportationCost: 3_000,
      taxRatePercent: 7.5,
      withholdingTaxRatePercent: 2,
    });
    expect(totals.subtotal).toBe(123_356.7);
    expect(totals.discount).toBe(500);
    expect(totals.taxableAmount).toBe(127_856.7);
    expect(totals.taxAmount).toBe(9_589.25);
    expect(totals.withholdingTaxAmount).toBe(2_557.13);
    expect(totals.totalAmount).toBe(137_445.95);
    expect(totals.netAmount).toBe(134_888.82);
  });
});
