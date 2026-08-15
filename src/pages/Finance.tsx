import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { InvoiceDialog } from "@/components/finance/InvoiceDialog";
import { RecordPaymentDialog } from "@/components/finance/RecordPaymentDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, DollarSign, TrendingUp, TrendingDown, Brain, CreditCard, Loader2, MoreVertical, Pencil, Trash2, FileDown, Receipt, FileText, AlertCircle, History, Link2, Banknote } from "lucide-react";
import { exportCsv } from "@/lib/exportCsv";
import { isFinanceCapable } from "@/lib/constants";
import { AuditHistoryDialog } from "@/components/AuditHistoryDialog";
import { formatCurrency } from "@/lib/constants";
import { useGsapAnimation } from "@/hooks/useGsapAnimation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { industrialDb } from "@/lib/industrialDb";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { stripMarkdown } from "@/lib/stripMarkdown";
import { WorkflowBanner } from "@/components/ui/workflow-banner";
import { AsyncBoundary } from "@/components/ui/async-boundary";
import type { Database } from "@/integrations/supabase/types";
import { humanizeError } from "@/lib/humanizeError";
import { calculateExpensePaymentStatus, calculateOutstandingBalance, calculateReceivablesFromAging } from "@/lib/financialMath";

type ExpenseItem = Database["public"]["Tables"]["expenses"]["Row"];
type PaymentItem = Database["public"]["Tables"]["worker_payments"]["Row"];
type ExpenseItemExtended = ExpenseItem & { account_id?: string | null; folio?: string | null; project_id?: string | null; site_reference?: string | null; vat_amount?: number | null; withholding_tax_amount?: number | null; part_payment?: number | null; outstanding_balance?: number | null; payment_status?: string | null };
type InvoiceItem = Database["public"]["Tables"]["invoices"]["Row"] & { clients?: { name: string } | null; sales_order_id?: string | null; project_id?: string | null; client_po_id?: string | null; delivery_id?: string | null; customer_reference?: string | null; client_name_snapshot?: string | null; client_tin_snapshot?: string | null; site_reference?: string | null; delivery_address?: string | null; delivery_contact?: string | null; delivery_state?: string | null; delivery_lga?: string | null; invoice_kind?: string | null; discount_amount?: number | null; overhead_amount?: number | null; transportation_cost?: number | null; tax_rate?: number | null; withholding_tax_rate?: number | null; withholding_tax_amount?: number | null; taxable_amount?: number | null; net_amount?: number | null; amount_paid?: number | null; payment_terms?: string | null; terms_and_conditions?: string | null; currency?: string | null; free_trade_zone?: boolean | null };
type ReceiptItem = Database["public"]["Tables"]["receipts"]["Row"] & { clients?: { name: string } | null };
type InvoiceLineItem = Database["public"]["Tables"]["invoice_items"]["Row"] & { item_type?: string | null; product_specification_id?: string | null };
type QuotationItem = { total_amount: number | null; created_at: string };
type BankTransactionItem = { id: string; transaction_date: string; description: string | null; reference: string | null; amount: number; direction: "credit" | "debit"; review_status: string; account_id: string; };
type FinanceTransactionLinkItem = { id: string; bank_transaction_id: string; entity_type: string; entity_id: string; linked_amount: number; notes: string | null; linked_at: string; };
type FinanceLinkEntityType = "invoice" | "receipt" | "expense" | "worker_payment" | "purchase_order" | "fuel_log" | "director_account" | "staff_loan" | "loan_repayment" | "salary_schedule" | "overtime" | "vat_entry" | "external_loan";
type FinanceLinkedSource = { id: string; label: string; amount: number };

const PAYMENT_TYPES = ["salary", "overtime", "fuel", "maintenance", "bonus", "transport", "vendor"] as const;
const EXPENSE_CATEGORIES = ["labor", "fuel", "transport", "materials", "equipment", "other"] as const;

const Finance = () => {
  const { user, memberships, activeRole, isMaintenance } = useAuth();
  const { toast } = useToast();
  const canViewHistory = activeRole === "administrator" || isFinanceCapable(activeRole) || isMaintenance;
  const orgId = memberships[0]?.organization_id;
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceItem | null>(null);
  const [historyTarget, setHistoryTarget] = useState<InvoiceItem | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "expense" | "payment" } | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentItem | null>(null);
  const containerRef = useGsapAnimation("slideUp");
  const defaultReportFrom = (() => { const d = new Date(); d.setMonth(d.getMonth() - 11, 1); return d.toISOString().slice(0, 10); })();
  const [reportFrom, setReportFrom] = useState(defaultReportFrom);
  const [reportTo, setReportTo] = useState(new Date().toISOString().slice(0, 10));

  // Payment form
  const [payType, setPayType] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDesc, setPayDesc] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payUserId, setPayUserId] = useState("");
  const [payVendorName, setPayVendorName] = useState("");
  const [payAccountId, setPayAccountId] = useState("none");
  const [payOverrideMatch, setPayOverrideMatch] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkEntityType, setLinkEntityType] = useState<FinanceLinkEntityType>("receipt");
  const [linkEntityId, setLinkEntityId] = useState("");
  const [linkBankTransactionId, setLinkBankTransactionId] = useState("");
  const [linkAmount, setLinkAmount] = useState("");
  const [linkNotes, setLinkNotes] = useState("");

  // Expense form
  const [expCategory, setExpCategory] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [expAccountId, setExpAccountId] = useState("none");
  const [expFolio, setExpFolio] = useState("");
  const [expSiteReference, setExpSiteReference] = useState("");
  const [expVatAmount, setExpVatAmount] = useState("");
  const [expWithholding, setExpWithholding] = useState("");
  const [expPartPayment, setExpPartPayment] = useState("");
  const [expOutstanding, setExpOutstanding] = useState("");

  // Deep-link: ?tab=invoices&new=1 opens the New Invoice dialog
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) setActiveTab(tab);
    if (searchParams.get("new") === "1" && (tab === "invoices" || activeTab === "invoices")) {
      setInvoiceOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
    if (searchParams.get("record") === "1" && (tab === "invoices" || activeTab === "invoices")) {
      const unpaid = (invoices as InvoiceItem[]).find(i => Number(i.balance_due ?? 0) > 0);
      if (unpaid) setPaymentInvoice(unpaid);
      const next = new URLSearchParams(searchParams);
      next.delete("record");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Members for employee selector
  const { data: members = [] } = useQuery({
    queryKey: ["members-finance", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data: mems } = await supabase.from("organization_memberships").select("user_id, role").eq("organization_id", orgId);
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").eq("organization_id", orgId);
      const profMap = new Map((profs ?? []).map(p => [p.user_id, p.full_name]));
      const seen = new Set<string>();
      return (mems ?? []).filter(m => { if (seen.has(m.user_id)) return false; seen.add(m.user_id); return true; })
        .map(m => ({ value: m.user_id, label: profMap.get(m.user_id) ?? "Unknown", role: m.role }));
    },
    enabled: !!orgId,
  });

  const { data: payments = [], refetch: refetchPayments, isLoading: paymentsLoading, error: paymentsError, dataUpdatedAt: paymentsUpdatedAt } = useQuery({
    queryKey: ["worker-payments", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("worker_payments").select("*").eq("organization_id", orgId).order("date", { ascending: false }).limit(100);
      return (data as PaymentItem[]) ?? [];
    },
    enabled: !!orgId,
  });

  const { data: financeAccounts = [] } = useQuery({ queryKey: ["finance-accounts-page", orgId], queryFn: async () => { if (!orgId) return []; const { data, error } = await industrialDb.from("finance_accounts").select("id, account_name, account_number").eq("organization_id", orgId).eq("is_active", true).order("account_name"); if (error) throw error; return data ?? []; }, enabled: !!orgId });

  const { data: expenses = [], refetch: refetchExpenses, isLoading: expensesLoading, error: expensesError } = useQuery({
    queryKey: ["expenses", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("expenses").select("*").eq("organization_id", orgId).order("date", { ascending: false }).limit(100);
      return (data as ExpenseItem[]) ?? [];
    },
    enabled: !!orgId,
  });

  const { data: invoices = [], refetch: refetchInvoices, isLoading: invoicesLoading, error: invoicesError, dataUpdatedAt: invoicesUpdatedAt } = useQuery({
    queryKey: ["invoices", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("invoices").select("*, clients(name)").eq("organization_id", orgId).order("created_at", { ascending: false });
      return (data ?? []) as unknown as InvoiceItem[];
    },
    enabled: !!orgId,
  });

  const { data: receipts = [], refetch: refetchReceipts, isLoading: receiptsLoading, error: receiptsError } = useQuery({
    queryKey: ["receipts", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("receipts").select("*, clients(name)").eq("organization_id", orgId).order("created_at", { ascending: false });
      return (data ?? []) as unknown as ReceiptItem[];
    },
    enabled: !!orgId,
  });

  const { data: bankTransactions = [], refetch: refetchBankTransactions, isLoading: bankTransactionsLoading, error: bankTransactionsError } = useQuery({
    queryKey: ["finance-bank-transactions", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await industrialDb.from("bank_transactions").select("id, transaction_date, description, reference, amount, direction, review_status, account_id").eq("organization_id", orgId).in("review_status", ["approved", "suggested", "linked"]).order("transaction_date", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as BankTransactionItem[];
    },
    enabled: !!orgId,
  });

  const { data: transactionLinks = [], refetch: refetchTransactionLinks, isLoading: transactionLinksLoading, error: transactionLinksError } = useQuery({
    queryKey: ["finance-transaction-links", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await industrialDb.from("finance_transaction_links").select("id, bank_transaction_id, entity_type, entity_id, linked_amount, notes, linked_at").eq("organization_id", orgId).order("linked_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as FinanceTransactionLinkItem[];
    },
    enabled: !!orgId,
  });
  const { data: additionalBankLinkSources = {}, error: additionalBankLinkSourcesError, refetch: refetchAdditionalBankLinkSources } = useQuery({
    queryKey: ["finance-bank-linkable-sources", orgId],
    queryFn: async () => {
      if (!orgId) return {} as Partial<Record<FinanceLinkEntityType, FinanceLinkedSource[]>>;
      const [purchaseOrders, fuelLogs, directorEntries, staffLoans, loanRepayments, salarySchedules, overtimeEntries, vatEntries, externalLoans] = await Promise.all([
        industrialDb.from("purchase_orders").select("id, document_number, total_amount, vendor_id, vendors(name)").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(200),
        industrialDb.from("fuel_logs").select("id, log_date, cost, vehicle_id, notes").eq("organization_id", orgId).order("log_date", { ascending: false }).limit(200),
        industrialDb.from("director_account_entries").select("id, entry_date, amount, transaction_type, folio, description").eq("organization_id", orgId).order("entry_date", { ascending: false }).limit(200),
        industrialDb.from("hr_staff_loans").select("id, amount, outstanding_balance, status, employee_id, start_date").eq("organization_id", orgId).order("start_date", { ascending: false }).limit(200),
        industrialDb.from("hr_loan_repayments").select("id, amount, payment_date, loan_id, notes").eq("organization_id", orgId).order("payment_date", { ascending: false }).limit(200),
        industrialDb.from("hr_salary_schedules").select("id, net_pay, period_start, period_end, status, employee_id").eq("organization_id", orgId).order("period_end", { ascending: false }).limit(200),
        industrialDb.from("hr_overtime_entries").select("id, overtime_earnings, period_month, status, employee_id").eq("organization_id", orgId).order("period_month", { ascending: false }).limit(200),
        industrialDb.from("vat_schedule_entries").select("id, entry_date, client_name, gross_amount, total_vat_credit_payable").eq("organization_id", orgId).order("entry_date", { ascending: false }).limit(200),
        industrialDb.from("hr_external_loans").select("id, lender, loan_date, principal_amount, remaining_balance, status").eq("organization_id", orgId).order("loan_date", { ascending: false }).limit(200),
      ]);
      const responses = [purchaseOrders, fuelLogs, directorEntries, staffLoans, loanRepayments, salarySchedules, overtimeEntries, vatEntries, externalLoans];
      const failed = responses.find((response) => response.error);
      if (failed?.error) throw failed.error;
      return {
        purchase_order: (purchaseOrders.data ?? []).map((row: any) => ({ id: row.id, label: `${row.document_number ?? "Purchase order"} · ${row.vendors?.name ?? "Vendor"}`, amount: Number(row.total_amount ?? 0) })),
        fuel_log: (fuelLogs.data ?? []).map((row: any) => ({ id: row.id, label: `${row.log_date} · Fuel${row.notes ? ` · ${row.notes}` : ""}`, amount: Number(row.cost ?? 0) })),
        director_account: (directorEntries.data ?? []).map((row: any) => ({ id: row.id, label: `${row.entry_date} · ${row.transaction_type}${row.folio ? ` · ${row.folio}` : ""}`, amount: Number(row.amount ?? 0) })),
        staff_loan: (staffLoans.data ?? []).map((row: any) => ({ id: row.id, label: `${row.start_date} · Staff loan · ${row.status}`, amount: Number(row.amount ?? 0) })),
        loan_repayment: (loanRepayments.data ?? []).map((row: any) => ({ id: row.id, label: `${row.payment_date} · Loan repayment`, amount: Number(row.amount ?? 0) })),
        salary_schedule: (salarySchedules.data ?? []).map((row: any) => ({ id: row.id, label: `${row.period_start} → ${row.period_end} · Salary · ${row.status}`, amount: Number(row.net_pay ?? 0) })),
        overtime: (overtimeEntries.data ?? []).map((row: any) => ({ id: row.id, label: `${row.period_month} · Overtime · ${row.status}`, amount: Number(row.overtime_earnings ?? 0) })),
        vat_entry: (vatEntries.data ?? []).map((row: any) => ({ id: row.id, label: `${row.entry_date} · VAT · ${row.client_name}`, amount: Number(row.total_vat_credit_payable ?? row.gross_amount ?? 0) })),
        external_loan: (externalLoans.data ?? []).map((row: any) => ({ id: row.id, label: `${row.loan_date} · ${row.lender} · ${row.status}`, amount: Number(row.principal_amount ?? 0) })),
      } as Partial<Record<FinanceLinkEntityType, FinanceLinkedSource[]>>;
    },
    enabled: !!orgId,
  });

  const { data: financeReport, isLoading: financeReportLoading, refetch: refetchFinanceReport } = useQuery({
    queryKey: ["finance-period-report", orgId, reportFrom, reportTo],
    queryFn: async () => { if (!orgId) return null; const { data, error } = await industrialDb.rpc("get_finance_period_report", { _org_id: orgId, _from: reportFrom, _to: reportTo }); if (error) throw error; return data as unknown as { invoiced: number; collected: number; operating_expenses: number; worker_payments: number; invoice_count: number; receipt_count: number; aging: Record<string, number>; monthly: Array<{ month: string; invoiced: number; collected: number; expenses: number; worker_payments: number }> }; },
    enabled: !!orgId,
    retry: false,
  });

  const { data: financeInsights } = useQuery({
    queryKey: ["ai-insights-finance"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_summaries").select("*").eq("organization_id", orgId).eq("context", "finance").order("created_at", { ascending: false }).limit(1);
      return data?.[0] ?? null;
    },
  });

  const financials = useMemo(() => {
    const totalRevenue = Number(financeReport?.invoiced ?? invoices.reduce((s, inv) => s + Number(inv.total_amount || 0), 0));
    const totalReceived = Number(financeReport?.collected ?? receipts.reduce((s, r) => s + Number(r.amount_received || 0), 0));
    const totalExpenses = Number(financeReport?.operating_expenses ?? expenses.reduce((s: number, e: ExpenseItem) => s + Number(e.amount ?? 0), 0));
    const totalPayments = Number(financeReport?.worker_payments ?? payments.reduce((s: number, p: PaymentItem) => s + Number(p.amount ?? 0), 0));
    const netProfit = totalReceived - totalExpenses - totalPayments;
    const aging = financeReport?.aging ?? {};
    const receivables = financeReport
      ? calculateReceivablesFromAging(aging)
      : invoices.filter((invoice) => !["paid", "cancelled", "draft"].includes(String(invoice.status))).reduce((sum, invoice) => sum + Number(invoice.balance_due ?? invoice.total_amount ?? 0), 0);

    const monthKey = (value: string | null | undefined) => {
      if (!value) return "unknown";
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? "unknown" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    };
    const monthLabel = (key: string) => {
      if (key === "unknown") return "Unknown";
      return new Date(`${key}-01T00:00:00`).toLocaleString("en", { month: "short", year: "2-digit" });
    };
    const monthlyMap = new Map<string, { revenue: number; expenses: number }>();
    const inReportPeriod = (value: string | null | undefined) => {
      if (!value) return false;
      const date = value.slice(0, 10);
      return date >= reportFrom && date <= reportTo;
    };
    invoices.filter((invoice) => invoice.status !== "draft" && inReportPeriod(invoice.invoice_date)).forEach((inv) => {
      const month = monthKey(inv.invoice_date);
      const entry = monthlyMap.get(month) ?? { revenue: 0, expenses: 0 };
      entry.revenue += Number(inv.total_amount ?? 0);
      monthlyMap.set(month, entry);
    });
    expenses.filter((expense: ExpenseItem) => inReportPeriod(expense.date)).forEach((e: ExpenseItem) => {
      const month = monthKey(e.date);
      const entry = monthlyMap.get(month) ?? { revenue: 0, expenses: 0 };
      entry.expenses += Number(e.amount ?? 0);
      monthlyMap.set(month, entry);
    });
    payments.filter((payment: PaymentItem) => inReportPeriod(payment.date)).forEach((payment: PaymentItem) => {
      const month = monthKey(payment.date);
      const entry = monthlyMap.get(month) ?? { revenue: 0, expenses: 0 };
      entry.expenses += Number(payment.amount ?? 0);
      monthlyMap.set(month, entry);
    });
    const chartData = financeReport?.monthly?.length ? financeReport.monthly.map((row) => ({ month: row.month, revenue: Number(row.invoiced ?? 0), expenses: Number(row.expenses ?? 0) + Number(row.worker_payments ?? 0) })) : Array.from(monthlyMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({ month: monthLabel(month), ...data }));

    return { totalRevenue, totalReceived, receivables, totalExpenses: totalExpenses + totalPayments, netProfit, totalPayments, chartData };
  }, [payments, expenses, invoices, receipts, financeReport, reportFrom, reportTo]);

  const getMemberName = (userId: string) => members.find(m => m.value === userId)?.label ?? "Unknown";
  const accountName = (accountId: string) => financeAccounts.find((account) => account.id === accountId)?.account_name ?? "Bank account";
  const calculatedExpenseOutstanding = calculateOutstandingBalance(Number(expAmount || 0), [Number(expPartPayment || 0)]);
  const calculatedExpenseStatus = calculateExpensePaymentStatus(calculatedExpenseOutstanding, Number(expPartPayment || 0));
    const linkSources = useMemo(() => {
    if (linkEntityType === "invoice") return (invoices as InvoiceItem[]).map((item) => ({ id: item.id, label: `${item.document_number ?? "Invoice"} · ${item.clients?.name ?? "Unknown client"}`, amount: Number(item.total_amount ?? 0) }));
    if (linkEntityType === "receipt") return (receipts as ReceiptItem[]).map((item) => ({ id: item.id, label: `${item.document_number ?? "Receipt"} · ${item.clients?.name ?? "Unknown client"}`, amount: Number(item.amount_received ?? 0) }));
    if (linkEntityType === "expense") return (expenses as ExpenseItem[]).map((item) => ({ id: item.id, label: `${item.date} · ${item.category} · ${item.description ?? "Expense"}`, amount: Number(item.amount ?? 0) }));
    if (linkEntityType === "worker_payment") return (payments as PaymentItem[]).map((item) => ({ id: item.id, label: `${item.date} · ${item.type} · ${item.description ?? "Worker payment"}`, amount: Number(item.amount ?? 0) }));
    return additionalBankLinkSources[linkEntityType] ?? [];
  }, [linkEntityType, invoices, receipts, expenses, payments, additionalBankLinkSources]);
  const openBankLinkDialog = (entityType: FinanceLinkEntityType, entityId?: string, amount?: number) => {
    setLinkEntityType(entityType);
    setLinkEntityId(entityId ?? "");
    setLinkAmount(amount && amount > 0 ? String(amount) : "");
    setLinkBankTransactionId("");
    setLinkNotes("");
    setLinkOpen(true);
  };

  const handleLinkBankTransaction = async () => {
    if (!orgId || !linkBankTransactionId || !linkEntityId || !linkAmount) {
      toast({ title: "Complete the bank link fields", description: "Select a bank transaction, an ERP record, and a positive amount.", variant: "destructive" });
      return;
    }
    const numericAmount = Number(linkAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast({ title: "Invalid link amount", description: "The linked amount must be a positive number.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await industrialDb.rpc("link_bank_transaction", { _org_id: orgId, _transaction_id: linkBankTransactionId, _entity_type: linkEntityType, _entity_id: linkEntityId, _linked_amount: numericAmount, _notes: linkNotes.trim() || null });
      if (error) throw error;
      toast({ title: "Bank transaction linked", description: "The bank line is now connected to the selected financial record." });
      setLinkOpen(false);
      setLinkEntityId("");
      setLinkBankTransactionId("");
      setLinkAmount("");
      setLinkNotes("");
      refetchBankTransactions();
      refetchTransactionLinks();
    } catch (err: unknown) {
      toast({ title: "Could not link bank transaction", description: humanizeError(err as Error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetPaymentForm = () => { setPayType(""); setPayAmount(""); setPayDesc(""); setPayUserId(""); setPayDate(new Date().toISOString().split("T")[0]); setEditingPayment(null); setPayVendorName(""); setPayAccountId("none"); setPayOverrideMatch(false); };
  const resetExpenseForm = () => { setExpCategory(""); setExpAmount(""); setExpDesc(""); setExpDate(new Date().toISOString().split("T")[0]); setExpAccountId("none"); setExpFolio(""); setExpSiteReference(""); setExpVatAmount(""); setExpWithholding(""); setExpPartPayment(""); setExpOutstanding(""); setEditingExpense(null); };

  const openEditPayment = (p: PaymentItem) => {
    setEditingPayment(p); setPayType(p.type); setPayAmount(p.amount.toString());
    setPayDesc(p.description ?? ""); setPayDate(p.date); setPayUserId(p.user_id ?? "");
    setPayVendorName(p.vendor_name ?? "");
    setPayAccountId((p as PaymentItem & { bank_account_id?: string | null }).bank_account_id ?? "none");
    setPaymentOpen(true);
  };

  const openEditExpense = (e: ExpenseItem) => {
    setEditingExpense(e); setExpCategory(e.category); setExpAmount(e.amount.toString());
    const extended = e as ExpenseItemExtended;
    setExpDesc(e.description ?? ""); setExpDate(e.date); setExpAccountId(extended.account_id ?? "none"); setExpFolio(extended.folio ?? ""); setExpSiteReference(extended.site_reference ?? ""); setExpVatAmount(extended.vat_amount?.toString() ?? ""); setExpWithholding(extended.withholding_tax_amount?.toString() ?? ""); setExpPartPayment(extended.part_payment?.toString() ?? ""); setExpOutstanding(extended.outstanding_balance?.toString() ?? "");
    setExpenseOpen(true);
  };

  const handleLogPayment = async () => {
    if (!payType || !payAmount || !user || !orgId) return;
    // Three-way-match gate for vendor payments: require PO + GRN unless the user explicitly overrides.
    if (payType === "vendor" && !editingPayment) {
      const nameTrim = payVendorName.trim();
      if (!nameTrim) {
        toast({
          title: "Vendor name required",
          description: "Enter the vendor exactly as it appears on the Purchase Order so we can match the payment.",
          variant: "destructive",
        });
        return;
      }
      // Lookup vendor → POs → GRNs
      const { data: vendorRows } = await supabase
        .from("vendors")
        .select("id")
        .eq("organization_id", orgId)
        .ilike("name", nameTrim)
        .limit(1);
      const vendorId = vendorRows?.[0]?.id;
      let hasPo = false;
      let hasGrn = false;
      if (vendorId) {
        const { data: poRows } = await supabase
          .from("purchase_orders")
          .select("id")
          .eq("organization_id", orgId)
          .eq("vendor_id", vendorId);
        hasPo = !!poRows?.length;
        if (hasPo) {
          const poIds = (poRows ?? []).map((p) => p.id);
          const { data: grnRows } = await supabase
            .from("goods_received_notes")
            .select("id")
            .in("purchase_order_id", poIds);
          hasGrn = !!grnRows?.length;
        }
      }
      if ((!hasPo || !hasGrn) && !payOverrideMatch) {
        toast({
          title: hasPo ? "No goods received yet" : "No matching Purchase Order",
          description: hasPo
            ? `A PO exists for "${nameTrim}" but no Goods Received Note has been logged. Record the GRN first, or tick "Pay without three-way match" to proceed.`
            : `No Purchase Order found for "${nameTrim}". Issue a PO in Procurement first, or tick "Pay without three-way match" to override.`,
          variant: "destructive",
        });
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        organization_id: orgId, created_by: user.id,
        type: payType as Database["public"]["Enums"]["payment_type"], amount: parseFloat(payAmount),
        description: payDesc || null, date: payDate, user_id: payUserId || null,
        vendor_name: payType === "vendor" ? (payVendorName.trim() || null) : null,
        bank_account_id: payAccountId === "none" ? null : payAccountId,
      } as Database["public"]["Tables"]["worker_payments"]["Insert"] & Record<string, unknown>;
      if (editingPayment) {
        const { error } = await supabase.from("worker_payments").update(payload as Database["public"]["Tables"]["worker_payments"]["Update"]).eq("id", editingPayment.id).eq("organization_id", orgId);
        if (error) throw error;
        toast({ title: "Payment updated" });
      } else {
        const { error } = await supabase.from("worker_payments").insert(payload);
        if (error) throw error;
        toast({ title: "Payment logged" });
        const { error: anomalyError } = await supabase.functions.invoke("anomaly-detection", { body: { organization_id: orgId } });
        if (anomalyError) {
          toast({ title: "Payment logged; anomaly scan unavailable", description: "The payment is saved, but the background anomaly check could not complete. Retry the scan from Finance later.", variant: "destructive" });
        }
      }
      setPaymentOpen(false); resetPaymentForm(); refetchPayments();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error", description: humanizeError(error), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleLogExpense = async () => {
    if (!expCategory || !expAmount || !user || !orgId) return;
    setSaving(true);
    try {
      const payload = {
        organization_id: orgId, created_by: user.id,
        category: expCategory as Database["public"]["Enums"]["expense_category"], amount: parseFloat(expAmount),
        description: expDesc || null, date: expDate,
        account_id: expAccountId === "none" ? null : expAccountId,
        folio: expFolio.trim() || null,
        site_reference: expSiteReference.trim() || null,
        vat_amount: Number(expVatAmount || 0),
        withholding_tax_amount: Number(expWithholding || 0),
        part_payment: Number(expPartPayment || 0),
        outstanding_balance: calculatedExpenseOutstanding,
        payment_status: calculatedExpenseStatus,
      } as Database["public"]["Tables"]["expenses"]["Insert"] & Record<string, unknown>;
      if (editingExpense) {
        const { error } = await supabase.from("expenses").update(payload as Database["public"]["Tables"]["expenses"]["Update"]).eq("id", editingExpense.id).eq("organization_id", orgId);
        if (error) throw error;
        toast({ title: "Expense updated" });
      } else {
        const { error } = await supabase.from("expenses").insert(payload);
        if (error) throw error;
        toast({ title: "Expense logged" });
      }
      setExpenseOpen(false); resetExpenseForm(); refetchExpenses();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error", description: humanizeError(error), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const linkedTransactionIds = useMemo(() => new Set(transactionLinks.map((link) => link.bank_transaction_id)), [transactionLinks]);
  const bankTransactionById = useMemo(() => new Map(bankTransactions.map((transaction) => [transaction.id, transaction])), [bankTransactions]);
  const entityIsBankLinked = (entityType: string, entityId: string) => transactionLinks.some((link) => link.entity_type === entityType && link.entity_id === entityId);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const table = deleteTarget.type === "expense" ? "expenses" : "worker_payments";
      const { error } = await supabase.from(table).delete().eq("id", deleteTarget.id).eq("organization_id", orgId);
      if (error) throw error;
      toast({ title: `${deleteTarget.type === "expense" ? "Expense" : "Payment"} deleted` });
      setDeleteTarget(null);
      if (deleteTarget.type === "expense") refetchExpenses(); else refetchPayments();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error", description: humanizeError(error), variant: "destructive" });
    }
  };

  const handleExportReport = async () => {
    const { generatePdf } = await import("@/lib/generatePdf");
    generatePdf({
      title: "Financial Report",
      senderName: user?.user_metadata?.full_name ?? "Finance Director",
      senderDepartment: "Finance & Accounts",
      contentSections: [
        { heading: "Financial Summary", bullets: [
          `Total Revenue: ${formatCurrency(financials.totalRevenue)}`,
          `Total Costs: ${formatCurrency(financials.totalExpenses)}`,
          `Net Profit: ${formatCurrency(financials.netProfit)}`,
          `Worker Payments: ${formatCurrency(financials.totalPayments)}`,
        ]},
      ],
      tableData: expenses.length > 0 ? {
        columns: [
          { header: "Date", dataKey: "date" },
          { header: "Category", dataKey: "category" },
          { header: "Description", dataKey: "description" },
          { header: "Amount (₦)", dataKey: "amount" },
        ],
        rows: expenses.slice(0, 50).map((e: ExpenseItem) => ({
          date: e.date, category: e.category,
          description: e.description || "—",
          amount: Number(e.amount).toLocaleString(),
        })),
        summary: [
          { label: "Total Expenses", value: formatCurrency(expenses.reduce((s: number, e: ExpenseItem) => s + Number(e.amount), 0)) },
        ],
      } : undefined,
      stampType: "finance",
      showSignature: true,
    });
  };

  return (
    <div ref={containerRef} className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Finance"
        description="Revenue, expenses, payments, and profit tracking"
        executiveSummary={`${invoices.filter((i: any) => i.status !== "paid").length} unpaid invoices · ${payments.length} recent payments tracked`}
        lastUpdated={Math.max(invoicesUpdatedAt || 0, paymentsUpdatedAt || 0) || null}
        onRefresh={() => { refetchInvoices(); refetchPayments(); refetchExpenses(); refetchReceipts(); refetchFinanceReport(); refetchBankTransactions(); refetchTransactionLinks(); refetchAdditionalBankLinkSources(); }}
      >
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => exportCsv(`invoices-${new Date().toISOString().slice(0, 10)}`, [
            { header: "Number", value: (i: InvoiceItem) => i.document_number ?? "" },
            { header: "Client", value: (i: InvoiceItem) => i.clients?.name ?? "" },
            { header: "Date", value: (i: InvoiceItem) => i.invoice_date ?? "" },
            { header: "Status", value: (i: InvoiceItem) => i.status },
            { header: "Total (NGN)", value: (i: InvoiceItem) => Number(i.total_amount ?? 0).toLocaleString() },
            { header: "Balance Due (NGN)", value: (i: InvoiceItem) => Number(i.balance_due ?? 0).toLocaleString() },
            { header: "Due Date", value: (i: InvoiceItem) => i.due_date ?? "" },
          ], invoices as InvoiceItem[])}><FileDown className="h-4 w-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportReport}><FileDown className="h-4 w-4 mr-1" />Export PDF</Button>
          <Button size="sm" onClick={() => { setActiveTab("invoices"); const next = new URLSearchParams(searchParams); next.set("tab", "invoices"); setSearchParams(next, { replace: true }); setInvoiceOpen(true); }}>
            <Receipt className="h-4 w-4 mr-1" />New Invoice
          </Button>
          <Dialog open={paymentOpen} onOpenChange={(o) => { setPaymentOpen(o); if (!o) resetPaymentForm(); }}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><CreditCard className="h-4 w-4 mr-1" />Log Payment</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingPayment ? "Edit" : "Log Worker"} Payment</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Employee</Label>
                  <Select value={payUserId} onValueChange={setPayUserId}><SelectTrigger><SelectValue placeholder="Select employee (optional)" /></SelectTrigger>
                    <SelectContent>{members.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Type *</Label>
                    <Select value={payType} onValueChange={setPayType}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>{PAYMENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Amount (₦) *</Label><Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" /></div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Input value={payDesc} onChange={(e) => setPayDesc(e.target.value)} placeholder="Payment description" /></div>
                <div className="space-y-2"><Label>Source bank account</Label><Select value={payAccountId} onValueChange={setPayAccountId}><SelectTrigger><SelectValue placeholder="Optional account" /></SelectTrigger><SelectContent><SelectItem value="none">Not assigned</SelectItem>{financeAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.account_name}{account.account_number ? ` · ${account.account_number}` : ""}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} /></div>
                {payType === "vendor" && (
                  <div className="space-y-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-warning">Vendor payment · three-way match</Label>
                    <Input
                      value={payVendorName}
                      onChange={(e) => setPayVendorName(e.target.value)}
                      placeholder="Vendor name (must match Purchase Order)"
                    />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Before saving we check that a Purchase Order exists for this vendor and that a Goods Received Note has been logged. This blocks paying for items the company never received.
                    </p>
                    <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-warning"
                        checked={payOverrideMatch}
                        onChange={(e) => setPayOverrideMatch(e.target.checked)}
                      />
                      <span>
                        Pay without three-way match <span className="italic">(use only for petty cash, advances, or one-off vendors — this will be flagged in the audit log)</span>
                      </span>
                    </label>
                  </div>
                )}
                <Button className="w-full" onClick={handleLogPayment} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}{editingPayment ? "Update" : "Save"} Payment</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={expenseOpen} onOpenChange={(o) => { setExpenseOpen(o); if (!o) resetExpenseForm(); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Log Expense</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingExpense ? "Edit" : "Log"} Expense</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Date</Label><Input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Category *</Label>
                    <Select value={expCategory} onValueChange={setExpCategory}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Input value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="Expense description" /></div>
                <div className="space-y-2"><Label>Source account</Label><Select value={expAccountId} onValueChange={setExpAccountId}><SelectTrigger><SelectValue placeholder="Optional account" /></SelectTrigger><SelectContent><SelectItem value="none">Not assigned</SelectItem>{financeAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.account_name}{account.account_number ? ` · ${account.account_number}` : ""}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Amount (₦) *</Label><Input type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="0.00" /></div><div className="space-y-2"><Label>Folio / reference</Label><Input value={expFolio} onChange={(e) => setExpFolio(e.target.value)} placeholder="Folio" /></div></div>
                <div className="space-y-2"><Label>Site / project reference</Label><Input value={expSiteReference} onChange={(e) => setExpSiteReference(e.target.value)} placeholder="Project, site, or cost centre" /></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="space-y-2"><Label>VAT</Label><Input type="number" value={expVatAmount} onChange={(e) => setExpVatAmount(e.target.value)} placeholder="0" /></div><div className="space-y-2"><Label>WHT</Label><Input type="number" value={expWithholding} onChange={(e) => setExpWithholding(e.target.value)} placeholder="0" /></div><div className="space-y-2"><Label>Part payment</Label><Input type="number" min="0" value={expPartPayment} onChange={(e) => setExpPartPayment(e.target.value)} placeholder="0" /></div><div className="space-y-2"><Label>Calculated outstanding</Label><Input type="number" value={calculatedExpenseOutstanding} readOnly className="bg-muted" /></div></div><p className="text-xs text-muted-foreground">Payment status: <span className="font-medium capitalize">{calculatedExpenseStatus.replace("_", " ")}</span>. The database trigger revalidates this balance when the record is written.</p>
                <Button className="w-full" onClick={handleLogExpense} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}{editingExpense ? "Update" : "Save"} Expense</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <Dialog open={linkOpen} onOpenChange={(open) => { setLinkOpen(open); if (!open) { setLinkEntityId(""); setLinkBankTransactionId(""); setLinkAmount(""); setLinkNotes(""); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-primary" />Link bank transaction to ERP record</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Only approved or suggested bank lines can be linked. The database validates that the selected record belongs to this organization and writes an auditable connection.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>ERP record type *</Label><Select value={linkEntityType} onValueChange={(value) => { const next = value as FinanceLinkEntityType; setLinkEntityType(next); setLinkEntityId(""); setLinkAmount(""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="invoice">Invoice</SelectItem><SelectItem value="receipt">Receipt</SelectItem><SelectItem value="expense">Expense</SelectItem><SelectItem value="worker_payment">Worker payment</SelectItem><SelectItem value="purchase_order">Purchase order</SelectItem><SelectItem value="fuel_log">Fuel log</SelectItem><SelectItem value="director_account">Director account</SelectItem><SelectItem value="staff_loan">Staff loan</SelectItem><SelectItem value="loan_repayment">Loan repayment</SelectItem><SelectItem value="salary_schedule">Salary schedule</SelectItem><SelectItem value="overtime">Overtime</SelectItem><SelectItem value="vat_entry">VAT entry</SelectItem><SelectItem value="external_loan">External loan</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>ERP record *</Label><Select value={linkEntityId} onValueChange={(value) => { setLinkEntityId(value); const source = linkSources.find((item) => item.id === value); if (source) setLinkAmount(String(source.amount)); }}><SelectTrigger><SelectValue placeholder="Select an ERP record" /></SelectTrigger><SelectContent>{linkSources.map((source) => <SelectItem key={source.id} value={source.id}>{source.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Bank transaction *</Label><Select value={linkBankTransactionId} onValueChange={setLinkBankTransactionId}><SelectTrigger><SelectValue placeholder={bankTransactionsLoading ? "Loading bank lines…" : "Select an approved bank line"} /></SelectTrigger><SelectContent>{bankTransactions.filter((transaction) => transaction.review_status !== "rejected").map((transaction) => <SelectItem key={transaction.id} value={transaction.id}>{transaction.transaction_date} · {transaction.direction === "credit" ? "+" : "−"}{formatCurrency(Number(transaction.amount))} · {accountName(transaction.account_id)} · {transaction.description ?? transaction.reference ?? "Bank transaction"}</SelectItem>)}</SelectContent></Select>{bankTransactions.length === 0 && <p className="text-xs text-muted-foreground">No approved or suggested bank transactions are available. Import and review a statement in HR → Bank & Reconciliation first.</p>}</div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Linked amount (₦) *</Label><Input type="number" min="0.01" step="0.01" value={linkAmount} onChange={(event) => setLinkAmount(event.target.value)} /></div><div className="space-y-2"><Label>Audit note</Label><Input value={linkNotes} onChange={(event) => setLinkNotes(event.target.value)} placeholder="Reason, reference, or reconciliation note" /></div></div>
            {(bankTransactionsError || transactionLinksError || additionalBankLinkSourcesError) && <p className="text-sm text-destructive">Bank analysis could not be loaded. Retry the page before linking.</p>}
            <Button className="w-full" onClick={handleLinkBankTransaction} disabled={saving || bankTransactionsLoading}>{saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Link2 className="mr-1 h-4 w-4" />}Save bank link</Button>
          </div>
        </DialogContent>
      </Dialog>

      <WorkflowBanner
        storageKey="finance-overview"
        title="How money moves through this page"
        summary="Sales raises a quotation → once accepted, you issue an Invoice → record incoming payments as Receipts → log outgoing Expenses and Worker Payments. Net Cash Position = received minus expenses + worker payments. AI flags anomalies in the background."
        steps={[
          { actor: "Sales / Reception", action: "Creates the quotation and converts it to an invoice once the client accepts." },
          { actor: "Finance (you)", action: "Issues invoice, records receipts, logs expenses & worker payments." },
          { actor: "System", action: "Auto-updates balance due, P&L per project, and flags unusual spending." },
        ]}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this {deleteTarget?.type}?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: formatCurrency(financials.totalRevenue), icon: DollarSign, color: "text-primary" },
          { label: "Total Received", value: formatCurrency(financials.totalReceived), icon: TrendingUp, color: "text-emerald-400" },
          { label: "Receivables", value: formatCurrency(financials.receivables), icon: AlertCircle, color: "text-warning" },
          { label: "Net Cash Position", value: formatCurrency(financials.netProfit), icon: CreditCard, color: "text-blue-400" },
        ].map(s => (
          <Card key={s.label} className="border-border/50 shadow-sm"><CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0"><p className="text-xs text-muted-foreground truncate font-medium">{s.label}</p><p className="text-xl md:text-2xl font-bold truncate text-foreground">{s.value}</p></div>
              <s.icon className={`h-8 w-8 ${s.color} opacity-60 shrink-0`} />
            </div>
          </CardContent></Card>
        ))}
      </div>

      {financeInsights && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-primary" />Finance AI Insights</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{stripMarkdown(financeInsights.summary)}</p>
            <p className="text-xs text-muted-foreground mt-2">Updated: {new Date(financeInsights.created_at).toLocaleString()}</p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); const next = new URLSearchParams(searchParams); next.set("tab", v); setSearchParams(next, { replace: true }); }} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto bg-transparent p-0 gap-1 h-auto scrollbar-hide">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Invoices</TabsTrigger>
          <TabsTrigger value="receipts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Receipts</TabsTrigger>
          <TabsTrigger value="expenses" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Expenses</TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Payments</TabsTrigger>
          <TabsTrigger value="bank-analysis" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Bank Analysis</TabsTrigger>
        </TabsList>

          <TabsContent value="overview" className="space-y-4">
          <Card><CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="text-base">Revenue vs Expenses</CardTitle><div className="flex flex-wrap items-end gap-2"><div><Label className="text-[11px]">From</Label><Input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="h-8 w-[145px] text-xs" /></div><div><Label className="text-[11px]">To</Label><Input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="h-8 w-[145px] text-xs" /></div></div></CardHeader>
            <CardContent>
              {financeReportLoading ? <div className="py-16 text-center text-sm text-muted-foreground">Loading selected reporting period…</div> : financials.chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-16">No financial data yet. Accept quotations and log expenses to see trends.</p>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financials.chartData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₦${(v/1000000).toFixed(1)}M`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                      <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4,4,0,0]} opacity={0.7} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
          {financeReport?.aging && <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{[["Current", financeReport.aging.current], ["1–30 days", financeReport.aging["1_30"]], ["31–60 days", financeReport.aging["31_60"]], ["61–90 days", financeReport.aging["61_90"]], ["90+ days", financeReport.aging["90_plus"]]].map(([label, value]) => <Card key={String(label)}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{formatCurrency(Number(value ?? 0))}</p></CardContent></Card>)}</div>}
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Client Invoices</CardTitle>
              <Button size="sm" onClick={() => setInvoiceOpen(true)}><Plus className="h-4 w-4 mr-1" />New Invoice</Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <AsyncBoundary
                loading={invoicesLoading}
                error={invoicesError}
                onRetry={() => refetchInvoices()}
                isEmpty={invoices.length === 0}
                loadingVariant="table"
                loadingRows={5}
                loadingColumns={6}
                className="p-6"
                emptyState={{
                  icon: FileText,
                  title: "No invoices issued yet",
                  description: "Issue an invoice once a client accepts a quotation. The invoice tracks the total billed and the balance still due — each receipt you record reduces the balance automatically.",
                  ownedBy: "Finance issues invoices; receipts come from Reception or Finance.",
                  action: { label: "Create your first invoice", onClick: () => setInvoiceOpen(true) },
                }}
              >
                <div className="min-w-[700px]">
                  <Table><TableHeader><TableRow>
                    <TableHead>Invoice #</TableHead><TableHead>Client / reference</TableHead><TableHead>Source / site</TableHead><TableHead>Date / due</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Gross / net</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Bank link</TableHead><TableHead className="w-[40px]"></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(invoices as InvoiceItem[]).map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="text-sm font-bold">{inv.document_number}</TableCell>
                        <TableCell className="text-sm"><div>{inv.clients?.name ?? inv.client_name_snapshot ?? "—"}</div><div className="text-[10px] text-muted-foreground">{inv.customer_reference ?? (inv.client_tin_snapshot ? `TIN ${inv.client_tin_snapshot}` : "No customer reference")}</div></TableCell>
                        <TableCell className="text-sm"><div>{inv.sales_order_id ? `Order ${inv.sales_order_id.slice(0, 8)}` : inv.invoice_kind ?? "Manual"}</div><div className="text-[10px] text-muted-foreground">{inv.site_reference ?? (inv.project_id ? `Project ${inv.project_id.slice(0, 8)}` : "No site reference")}</div></TableCell>
                        <TableCell className="text-sm"><div>{inv.invoice_date}</div><div className="text-[10px] text-muted-foreground">Due {inv.due_date ?? "—"}</div></TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{inv.status}</Badge></TableCell>
                        <TableCell className="text-right"><div>{formatCurrency(inv.total_amount)}</div><div className="text-[10px] text-muted-foreground">Net {formatCurrency(inv.net_amount ?? inv.total_amount)}</div></TableCell>
                        <TableCell className="text-right font-bold text-primary"><div>{formatCurrency(inv.balance_due)}</div><div className="text-[10px] text-muted-foreground">Paid {formatCurrency(inv.amount_paid ?? Number(inv.total_amount ?? 0) - Number(inv.balance_due ?? 0))}</div></TableCell>
                        <TableCell>{entityIsBankLinked("invoice", inv.id) ? <Badge className="bg-emerald-600">Linked</Badge> : <Badge variant="outline">Unlinked</Badge>}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                          {Number(inv.balance_due ?? 0) > 0 && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-emerald-600 hover:text-emerald-700" onClick={() => setPaymentInvoice(inv)}>
                              <Receipt className="h-3.5 w-3.5 mr-1" />Record
                            </Button>
                          )}
                          {canViewHistory && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Revision history" onClick={() => setHistoryTarget(inv)}>
                              <History className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Download PDF" onClick={async () => {
                            const { generatePdf } = await import("@/lib/generatePdf");
                            const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
                            generatePdf({
                              title: `Invoice ${inv.document_number}`,
                              senderName: "NIF Technical Services Ltd",
                              contentSections: [{ heading: "Billing and project", bullets: [`Client: ${inv.clients?.name ?? "N/A"}`, inv.client_tin_snapshot ? `Client TIN: ${inv.client_tin_snapshot}` : "", inv.customer_reference ? `Customer reference: ${inv.customer_reference}` : "", inv.client_po_id ? `Client PO: ${inv.client_po_id}` : "", inv.sales_order_id ? `Sales order: ${inv.sales_order_id}` : "", inv.project_id ? `Project: ${inv.project_id}` : "", inv.site_reference ? `Site reference: ${inv.site_reference}` : "", inv.delivery_address ? `Delivery address: ${inv.delivery_address}` : "", inv.delivery_contact ? `Delivery contact: ${inv.delivery_contact}` : "", inv.delivery_state || inv.delivery_lga ? `Delivery location: ${[inv.delivery_state, inv.delivery_lga].filter(Boolean).join(" / ")}` : "", `Invoice type: ${(inv.invoice_kind ?? "standard").replace("_", " ")}`, `Invoice date: ${inv.invoice_date ?? "N/A"}`, `Due date: ${inv.due_date ?? "Not specified"}`, `Status: ${(inv.status ?? "draft").toUpperCase()}`].filter(Boolean) }, { heading: "Payment terms", bullets: [inv.payment_terms ? `Terms: ${inv.payment_terms}` : "", inv.terms_and_conditions ? `Conditions: ${inv.terms_and_conditions}` : "", `Taxable amount: ${formatCurrency(Number(inv.taxable_amount ?? inv.subtotal ?? 0))}`, `VAT / tax: ${formatCurrency(Number(inv.tax_amount ?? 0))}`, `WHT: ${formatCurrency(Number(inv.withholding_tax_amount ?? 0))}`, `Gross total: ${formatCurrency(Number(inv.total_amount ?? 0))}`, `Amount received: ${formatCurrency(Number(inv.amount_paid ?? Number(inv.total_amount ?? 0) - Number(inv.balance_due ?? 0)))}`, `Net due: ${formatCurrency(Number(inv.net_amount ?? inv.total_amount ?? 0))}`, `Balance due: ${formatCurrency(inv.balance_due ?? 0)}`].filter(Boolean) }],
                              tableData: items ? {
                                columns: [
                                  { header: "Description", dataKey: "description" },
                                  { header: "Type", dataKey: "item_type" },
                                  { header: "Qty", dataKey: "quantity" },
                                  { header: "Price (₦)", dataKey: "unit_price" },
                                  { header: "Total (₦)", dataKey: "total_price" }
                                ],
                                rows: (items as InvoiceLineItem[]).map((i) => ({
                                  description: i.description,
                                  item_type: (i as InvoiceLineItem).item_type ?? "other",
                                  quantity: i.quantity,
                                  unit_price: Number(i.unit_price).toLocaleString(),
                                  total_price: Number(i.total_price).toLocaleString()
                                })),
                                summary: [
                                  { label: "Subtotal", value: formatCurrency(inv.subtotal ?? 0) },
                                  ...((inv.discount_amount ?? 0) > 0 ? [{ label: "Discount", value: `-${formatCurrency(inv.discount_amount ?? 0)}` }] : []),
                                  ...((inv.overhead_amount ?? 0) > 0 ? [{ label: "Overhead / site cost", value: formatCurrency(inv.overhead_amount ?? 0) }] : []),
                                  ...((inv.transportation_cost ?? 0) > 0 ? [{ label: "Transportation", value: formatCurrency(inv.transportation_cost ?? 0) }] : []),
                                  ...((inv.tax_amount ?? 0) > 0 ? [{ label: `Tax (${inv.tax_rate ?? 0}%)`, value: formatCurrency(inv.tax_amount ?? 0) }] : []),
                                  ...((inv.withholding_tax_amount ?? 0) > 0 ? [{ label: `WHT (${inv.withholding_tax_rate ?? 0}%)`, value: `-${formatCurrency(inv.withholding_tax_amount ?? 0)}` }] : []),
                                  { label: "Gross total", value: formatCurrency(inv.total_amount) },
                                  { label: "Net due", value: formatCurrency(inv.net_amount ?? inv.total_amount) },
                                  { label: "Balance Due", value: formatCurrency(inv.balance_due) },
                                ]
                              } : undefined,
                              stampType: "finance",
                              companyName: "NIF Technical Services",
                              documentId: inv.document_number ?? inv.id,
                              showSignature: true,
                              watermark: inv.status === "paid" ? "FINAL" : inv.status === "draft" ? "DRAFT" : null,
                            });
                          }}><FileDown className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody></Table>
                </div>
              </AsyncBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts">
          <Card><CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-5 w-5 text-emerald-500" /> Payment Receipts</CardTitle>
          </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <AsyncBoundary
                loading={receiptsLoading}
                error={receiptsError}
                onRetry={() => refetchReceipts()}
                isEmpty={receipts.length === 0}
                loadingVariant="table"
                loadingRows={5}
                loadingColumns={5}
                className="p-6"
                emptyState={{
                  compact: true,
                  icon: Receipt,
                  title: "No payments recorded yet",
                  description: "Receipts are created automatically when you record a payment against an invoice. Open the Invoices tab and tap 'Record' on any unpaid invoice.",
                  ownedBy: "Generated when Finance records an invoice payment.",
                }}
              >
                <div className="min-w-[600px]">
                  <Table><TableHeader><TableRow>
                    <TableHead>Receipt #</TableHead><TableHead>Client</TableHead><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount Received</TableHead><TableHead>Bank link</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(receipts as ReceiptItem[]).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm font-bold">{r.document_number}</TableCell>
                        <TableCell className="text-sm">{r.clients?.name}</TableCell>
                        <TableCell className="text-sm">{r.payment_date}</TableCell>
                        <TableCell className="text-sm capitalize">{r.payment_method}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(r.amount_received)}</TableCell>
                        <TableCell>{entityIsBankLinked("receipt", r.id) ? <Badge className="bg-emerald-600">Linked</Badge> : <Badge variant="outline">Unlinked</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody></Table>
                </div>
              </AsyncBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card><CardHeader><CardTitle className="text-base">Logged Expenses</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <AsyncBoundary
                loading={expensesLoading}
                error={expensesError}
                onRetry={() => refetchExpenses()}
                isEmpty={expenses.length === 0}
                loadingVariant="table"
                loadingRows={5}
                loadingColumns={5}
                className="p-6"
                emptyState={{
                  compact: true,
                  icon: TrendingDown,
                  title: "No expenses logged",
                  description: "Log operational spend (fuel, materials, transport, equipment) so the system can report true net profit per project. Use 'Log Expense' in the page header.",
                  ownedBy: "Logged by Finance; flagged by AI if amounts look unusual.",
                  action: { label: "Log Expense", onClick: () => setExpenseOpen(true) },
                }}
              >
                <div className="min-w-[600px]">
                  <Table><TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Bank link</TableHead><TableHead className="w-[40px]"></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {expenses.map((e: ExpenseItem) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{e.date}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{e.category}</Badge></TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" title={e.description || ""}>{e.description || "—"}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                        <TableCell>{entityIsBankLinked("expense", e.id) ? <Badge className="bg-emerald-600">Linked</Badge> : <Badge variant="outline">Unlinked</Badge>}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditExpense(e)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget({ id: e.id, type: "expense" })}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody></Table>
                </div>
              </AsyncBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card><CardHeader><CardTitle className="text-base">Worker Payments</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <AsyncBoundary
                loading={paymentsLoading}
                error={paymentsError}
                onRetry={() => refetchPayments()}
                isEmpty={payments.length === 0}
                loadingVariant="table"
                loadingRows={5}
                loadingColumns={6}
                className="p-6"
                emptyState={{
                  compact: true,
                  icon: CreditCard,
                  title: "No worker payments logged",
                  description: "Use 'Log Payment' in the page header for fuel, overtime, bonus, vendor and ad-hoc payments. Monthly salaries (with PAYE/pension/NHF) live in HR → Payroll.",
                  ownedBy: "Logged by Finance; salaries flow from HR Payroll.",
                  action: { label: "Log Payment", onClick: () => setPaymentOpen(true) },
                }}
              >
                <div className="min-w-[700px]">
                  <Table><TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Bank link</TableHead><TableHead className="w-[40px]"></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {payments.map((p: PaymentItem) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{p.date}</TableCell>
                        <TableCell className="text-sm">{p.user_id ? getMemberName(p.user_id) : "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{p.type}</Badge></TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" title={p.description || ""}>{p.description || "—"}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                        <TableCell>{entityIsBankLinked("worker_payment", p.id) ? <Badge className="bg-emerald-600">Linked</Badge> : <Badge variant="outline">Unlinked</Badge>}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditPayment(p)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget({ id: p.id, type: "payment" })}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody></Table>
                </div>
              </AsyncBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank-analysis" className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Reviewed bank lines</p><p className="mt-1 text-2xl font-bold">{bankTransactions.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Linked lines</p><p className="mt-1 text-2xl font-bold text-emerald-600">{linkedTransactionIds.size}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Awaiting ERP connection</p><p className="mt-1 text-2xl font-bold text-warning">{Math.max(0, bankTransactions.length - linkedTransactionIds.size)}</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-base"><Banknote className="h-5 w-5 text-primary" />Bank Analysis</CardTitle><p className="mt-1 text-sm text-muted-foreground">The central connection layer between imported bank lines and invoices, receipts, expenses, and payments.</p></div><Button size="sm" onClick={() => openBankLinkDialog("receipt")}><Link2 className="mr-1 h-4 w-4" />Link bank line</Button></CardHeader>
            <CardContent className="space-y-6">
              {bankTransactionsError || transactionLinksError ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Bank analysis could not be loaded. Use Refresh to retry; no connection is silently treated as reconciled.</div> : null}
              <div><h3 className="mb-2 text-sm font-semibold">Bank lines awaiting an ERP connection</h3><div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Direction</TableHead><TableHead>Description</TableHead><TableHead>Review</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="w-[110px]"></TableHead></TableRow></TableHeader><TableBody>{bankTransactions.filter((transaction) => !linkedTransactionIds.has(transaction.id)).map((transaction) => <TableRow key={transaction.id}><TableCell className="text-sm">{transaction.transaction_date}</TableCell><TableCell><Badge variant="outline" className="capitalize">{transaction.direction}</Badge></TableCell><TableCell className="max-w-[280px] truncate text-sm" title={transaction.description ?? transaction.reference ?? ""}>{transaction.description ?? transaction.reference ?? "—"}</TableCell><TableCell><Badge variant="secondary" className="capitalize">{transaction.review_status.split("_").join(" ")}</Badge></TableCell><TableCell className="text-right font-medium">{formatCurrency(Number(transaction.amount))}</TableCell><TableCell><Button variant="outline" size="sm" onClick={() => openBankLinkDialog(transaction.direction === "credit" ? "receipt" : "expense", undefined, Number(transaction.amount))}>Connect</Button></TableCell></TableRow>)}{!bankTransactionsLoading && bankTransactions.filter((transaction) => !linkedTransactionIds.has(transaction.id)).length === 0 ? <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No reviewed bank lines are awaiting connection.</TableCell></TableRow> : null}</TableBody></Table></div></div>
              <div><h3 className="mb-2 text-sm font-semibold">Existing ERP connections</h3><div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Bank line</TableHead><TableHead>ERP type</TableHead><TableHead>ERP record</TableHead><TableHead>Linked on</TableHead><TableHead className="text-right">Linked amount</TableHead></TableRow></TableHeader><TableBody>{transactionLinks.map((link) => { const transaction = bankTransactionById.get(link.bank_transaction_id); return <TableRow key={link.id}><TableCell className="text-sm">{transaction ? `${transaction.transaction_date} · ${transaction.description ?? transaction.reference ?? "Bank line"}` : link.bank_transaction_id}</TableCell><TableCell><Badge variant="outline" className="capitalize">{link.entity_type.split("_").join(" ")}</Badge></TableCell><TableCell className="font-mono text-xs">{link.entity_id}</TableCell><TableCell className="text-sm">{new Date(link.linked_at).toLocaleString()}</TableCell><TableCell className="text-right font-medium text-emerald-600">{formatCurrency(Number(link.linked_amount))}</TableCell></TableRow>; })}{!transactionLinksLoading && transactionLinks.length === 0 ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No bank-to-ERP links recorded yet.</TableCell></TableRow> : null}</TableBody></Table></div></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <InvoiceDialog open={invoiceOpen} onOpenChange={setInvoiceOpen} onCreated={() => refetchInvoices()} />
      <RecordPaymentDialog
        open={!!paymentInvoice}
        onOpenChange={(o) => { if (!o) setPaymentInvoice(null); }}
        invoice={paymentInvoice}
        financeAccounts={financeAccounts as Array<{ id: string; account_name: string; account_number?: string | null }>}
        onRecorded={() => { refetchInvoices(); refetchReceipts?.(); }}
      />

      <AuditHistoryDialog
        open={!!historyTarget}
        onOpenChange={(o) => !o && setHistoryTarget(null)}
        tableName="invoices"
        recordId={historyTarget?.id ?? ""}
        orgId={orgId ?? ""}
        title={historyTarget ? `Revision History — ${historyTarget.document_number ?? "Invoice"}` : undefined}
      />
    </div>
  );
};

export default Finance;
