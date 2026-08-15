export type QuotationCalculationInput = {
  items: Array<{ quantity: number; unitPrice: number }>;
  laborUnits: number;
  laborRate: number;
  transportCost: number;
  profitMarginPercent: number;
  discountAmount: number;
  overheadAmount: number;
  taxRatePercent: number;
};

export type QuotationCalculationResult = {
  subtotal: number;
  laborTotal: number;
  profitAmount: number;
  baseCommercialTotal: number;
  discount: number;
  taxableTotal: number;
  taxAmount: number;
  grandTotal: number;
};

export const roundMoney = (value: number): number => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

export function calculateQuotationTotals(input: QuotationCalculationInput): QuotationCalculationResult {
  const subtotal = roundMoney(input.items.reduce((sum, item) => sum + roundMoney(Math.max(0, item.quantity) * Math.max(0, item.unitPrice)), 0));
  const laborTotal = roundMoney(Math.max(0, input.laborUnits) * Math.max(0, input.laborRate));
  const transportCost = roundMoney(Math.max(0, input.transportCost));
  const profitBase = subtotal + laborTotal + transportCost;
  const profitAmount = roundMoney(profitBase * (Math.max(0, input.profitMarginPercent) / 100));
  const baseCommercialTotal = roundMoney(profitBase + profitAmount);
  const discount = roundMoney(Math.min(baseCommercialTotal, Math.max(0, input.discountAmount)));
  const taxableTotal = roundMoney(Math.max(0, baseCommercialTotal - discount + Math.max(0, input.overheadAmount)));
  const taxAmount = roundMoney(taxableTotal * (Math.max(0, input.taxRatePercent) / 100));
  return { subtotal, laborTotal, profitAmount, baseCommercialTotal, discount, taxableTotal, taxAmount, grandTotal: roundMoney(taxableTotal + taxAmount) };
}

export function calculateOutstandingBalance(total: number, payments: number[]): number {
  return roundMoney(Math.max(0, Number(total) - payments.reduce((sum, payment) => sum + Math.max(0, Number(payment) || 0), 0)));
}

export type VatScheduleInput = {
  grossAmount: number;
  outputVat: number;
  inputVat: number;
  vatWithheld: number;
  vatPaid: number;
  penalty: number;
  interest: number;
  broughtForward: number;
  lrp: number;
};

export function calculateVatSchedule(input: VatScheduleInput) {
  const grossAmount = roundMoney(Math.max(0, input.grossAmount));
  const outputVat = roundMoney(Math.max(0, input.outputVat));
  const inputVat = roundMoney(Math.max(0, input.inputVat));
  const vatWithheld = roundMoney(Math.max(0, input.vatWithheld));
  const vatPaid = roundMoney(Math.max(0, input.vatPaid));
  const penalty = roundMoney(Math.max(0, input.penalty));
  const interest = roundMoney(Math.max(0, input.interest));
  const broughtForward = roundMoney(Math.max(0, input.broughtForward));
  const lrp = roundMoney(Math.max(0, input.lrp));
  const netAmount = roundMoney(Math.max(0, grossAmount - vatWithheld));
  const currentVat = roundMoney(outputVat - inputVat);
  const totalCreditPayable = roundMoney(currentVat - vatWithheld - vatPaid + penalty + interest - broughtForward - lrp);
  return { grossAmount, outputVat, inputVat, vatWithheld, vatPaid, penalty, interest, broughtForward, lrp, netAmount, vatPayable: Math.max(0, totalCreditPayable), vatCredit: Math.max(0, roundMoney(-totalCreditPayable)), totalCreditPayable };
}

export function calculateReconciliationDifference(expected: number, actual: number): number {
  return roundMoney(Number(actual || 0) - Number(expected || 0));
}

export function calculateLoanBalance(principal: number, additionalLoans: number, repayments: number[]): number {
  return roundMoney(Math.max(0, Math.max(0, principal) + Math.max(0, additionalLoans) - repayments.reduce((sum, repayment) => sum + Math.max(0, repayment), 0)));
}


export type ExpensePaymentStatus = "unpaid" | "partially_paid" | "paid";

export function calculateExpensePaymentStatus(outstandingBalance: number, partPayment: number): ExpensePaymentStatus {
  const outstanding = roundMoney(Math.max(0, Number(outstandingBalance) || 0));
  const paid = roundMoney(Math.max(0, Number(partPayment) || 0));
  if (outstanding > 0 && paid > 0) return "partially_paid";
  if (outstanding > 0) return "unpaid";
  return "paid";
}
