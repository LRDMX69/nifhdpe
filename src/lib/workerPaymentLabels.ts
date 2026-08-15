export type WorkerPaymentLabelInput = {
  type: string | null | undefined;
  description?: string | null;
};

/**
 * Historical UAT rows may retain `salary` as their stored enum while their
 * description identifies a staff-loan repayment. Prefer the explicit enum,
 * but make the user-facing label truthful for those legacy rows as well.
 */
export function workerPaymentTypeLabel(payment: WorkerPaymentLabelInput): string {
  const storedType = String(payment.type ?? "");
  if (storedType === "salary" && /(loan|staff).*repay|repay.*(loan|staff)/i.test(payment.description ?? "")) {
    return "loan repayment";
  }
  return storedType.replace(/_/g, " ");
}
