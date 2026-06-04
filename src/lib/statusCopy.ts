/**
 * Canonical status vocabulary used across the ERP. Every status badge
 * should reference this map so labels, colours and tooltips stay
 * consistent between modules (Leaves, Invoices, Deliveries, Equipment
 * Requests, Print Requests, Role Requests, …).
 */
export type StatusVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "success"
  | "warning";

export interface StatusMeta {
  label: string;
  description: string;
  variant: StatusVariant;
  responsibleNext?: string;
}

export const STATUS_COPY: Record<string, StatusMeta> = {
  draft: {
    label: "Draft",
    description: "Saved but not yet submitted. Visible only to you.",
    variant: "outline",
    responsibleNext: "You — submit when ready.",
  },
  pending: {
    label: "Pending",
    description: "Submitted and waiting for review.",
    variant: "secondary",
    responsibleNext: "The relevant approver will review it shortly.",
  },
  under_review: {
    label: "Under Review",
    description: "An approver has opened this record and is evaluating it.",
    variant: "secondary",
    responsibleNext: "Reviewer will approve or reject.",
  },
  approved: {
    label: "Approved",
    description: "The request has been accepted. Downstream actions can now proceed.",
    variant: "success",
  },
  rejected: {
    label: "Rejected",
    description: "The request was declined. Check the rejection note before resubmitting.",
    variant: "destructive",
    responsibleNext: "You — revise and resubmit if appropriate.",
  },
  in_progress: {
    label: "In Progress",
    description: "Work is actively underway.",
    variant: "default",
  },
  completed: {
    label: "Completed",
    description: "All required steps have been finished.",
    variant: "success",
  },
  cancelled: {
    label: "Cancelled",
    description: "This record was cancelled and will not proceed.",
    variant: "outline",
  },
  paid: {
    label: "Paid",
    description: "Payment has been received and recorded.",
    variant: "success",
  },
  unpaid: {
    label: "Unpaid",
    description: "Payment has not yet been received.",
    variant: "warning",
  },
  overdue: {
    label: "Overdue",
    description: "Past the due date. Follow up with the client or vendor.",
    variant: "destructive",
  },
  delivered: {
    label: "Delivered",
    description: "Items have arrived at the destination and been confirmed on-site.",
    variant: "success",
  },
  dispatched: {
    label: "Dispatched",
    description: "Goods have left the warehouse and are on the way.",
    variant: "default",
  },
  scheduled: {
    label: "Scheduled",
    description: "Booked for a future date. No action required yet.",
    variant: "outline",
  },
};

export function getStatusMeta(status: string | null | undefined): StatusMeta {
  if (!status) {
    return { label: "—", description: "No status set.", variant: "outline" };
  }
  const key = status.toLowerCase().replace(/[\s-]+/g, "_");
  return (
    STATUS_COPY[key] ?? {
      label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      description: "Custom status — see record details for context.",
      variant: "outline",
    }
  );
}