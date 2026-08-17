import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileWarning,
  HeartPulse,
  Landmark,
  RefreshCw,
  ReceiptText,
  Scale,
  ShieldAlert,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCurrency } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { industrialDb } from "@/lib/industrialDb";

type RawRow = Record<string, any>;
type FinanceReport = {
  invoiced?: number | null;
  collected?: number | null;
  operating_expenses?: number | null;
  worker_payments?: number | null;
  aging?: Record<string, number | null> | null;
  monthly?: Array<{ month: string; invoiced?: number | null; collected?: number | null; expenses?: number | null; worker_payments?: number | null }>;
};
type TrendPoint = { month: string; income: number; spending: number };

type Snapshot = {
  staffCount: number;
  pendingLeaves: number;
  currentlyOnLeave: number;
  openDisciplinary: number;
  pendingHrActions: number;
  payrollGross: number;
  payrollNet: number;
  pendingPayrollNet: number;
  paidPayrollNet: number;
  overtimeTotal: number;
  pendingOvertime: number;
  paidOvertime: number;
  staffLoansOutstanding: number;
  activeHmoCount: number;
  activeHmoCost: number;
  latestBankPosition: number;
  pettyCashPosition: number;
  incomeReceived: number;
  totalExpenses: number;
  receivables: number;
  unpaidInvoiceCount: number;
  totalInvoiceValue: number;
  supplierObligations: number;
  procurementPaid: number;
  vatPayable: number;
  outputVat: number;
  inputVat: number;
  withholdingTax: number;
  externalLoansOutstanding: number;
  siteExpenses: number;
  administrativeExpenses: number;
  importExposure: number;
  forexExposure: number;
  pendingBankReview: number;
  pendingBankAmount: number;
  reconciliationExceptions: number;
  trend: TrendPoint[];
};

type Props = { orgId?: string; activeRole?: string };

const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isInPeriod = (value: unknown, from: string, to: string) => {
  if (!value) return true;
  const date = String(value).slice(0, 10);
  return date >= from && date <= to;
};

const isOperationalInvoice = (row: RawRow) => !["draft", "cancelled", "void"].includes(String(row.status ?? "").toLowerCase());
const isPendingPayrollStatus = (status: unknown) => ["submitted", "approved"].includes(String(status ?? "").toLowerCase());

const SummaryMetric = ({ label, value, detail, href, icon: Icon, tone = "default" }: { label: string; value: string | number; detail: string; href: string; icon: typeof Users; tone?: "default" | "warning" | "success" | "danger" }) => {
  const toneClass = tone === "warning" ? "text-warning" : tone === "success" ? "text-emerald-500" : tone === "danger" ? "text-destructive" : "text-primary";
  return (
    <Link to={href} className="group flex min-w-0 items-start justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-primary/[0.05] focus:outline-none focus:ring-2 focus:ring-primary/40 sm:px-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2"><Icon className={`h-4 w-4 shrink-0 ${toneClass}`} /><p className="truncate text-xs font-medium text-muted-foreground">{label}</p></div>
        <p className="mt-1 truncate text-lg font-bold tracking-tight">{value}</p>
        <p className="truncate text-[11px] text-muted-foreground">{detail}</p>
      </div>
      <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
};

const AttentionItem = ({ label, detail, href, tone = "warning" }: { label: string; detail: string; href: string; tone?: "warning" | "danger" | "success" }) => (
  <Link to={href} className="group flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40">
    <div className="flex min-w-0 items-start gap-2.5">
      {tone === "danger" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> : tone === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />}
      <div className="min-w-0"><p className="truncate text-sm font-medium">{label}</p><p className="truncate text-xs text-muted-foreground">{detail}</p></div>
    </div>
    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
  </Link>
);

const TrendBars = ({ points }: { points: TrendPoint[] }) => {
  const visible = points.slice(-6);
  const maximum = Math.max(1, ...visible.flatMap((point) => [point.income, point.spending]));
  if (visible.length === 0 || !visible.some((point) => point.income > 0 || point.spending > 0)) return <p className="py-4 text-sm text-muted-foreground">Finance movement will appear here after income or spending is recorded.</p>;
  return <div className="space-y-3">{visible.map((point) => <div key={point.month} className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3"><span className="text-[11px] text-muted-foreground">{point.month}</span><div className="space-y-1"><div className="flex items-center gap-2"><div className="h-2 rounded-full bg-emerald-500/80" style={{ width: `${Math.max(2, (point.income / maximum) * 100)}%` }} /><span className="truncate text-[10px] text-muted-foreground">In {formatCurrency(point.income)}</span></div><div className="flex items-center gap-2"><div className="h-2 rounded-full bg-destructive/70" style={{ width: `${Math.max(2, (point.spending / maximum) * 100)}%` }} /><span className="truncate text-[10px] text-muted-foreground">Out {formatCurrency(point.spending)}</span></div></div></div>)}</div>;
};

export function HRFinanceCommandCenter({ orgId, activeRole }: Props) {
  const canView = ["hr", "administrator"].includes(activeRole ?? "") || activeRole === undefined;
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["hr-dashboard-summary", orgId],
    queryFn: async (): Promise<Snapshot> => {
      if (!orgId) throw new Error("Organization context is not ready.");
      const to = new Date().toISOString().slice(0, 10);
      const fromDate = new Date();
      fromDate.setMonth(fromDate.getMonth() - 11, 1);
      const from = fromDate.toISOString().slice(0, 10);
      const [membersResult, leavesResult, disciplinaryResult, salariesResult, overtimeResult, loansResult, hmoResult, externalLoansResult, vatResult, accountsResult, statementsResult, bankLinesResult, reconciliationsResult, invoicesResult, receiptsResult, expensesResult, purchaseOrdersResult, financeReportResult] = await Promise.all([
        supabase.from("organization_memberships").select("user_id, role").eq("organization_id", orgId),
        supabase.from("leave_requests").select("id, status, start_date, end_date, hr_review_status, md_decision").eq("organization_id", orgId).limit(200),
        supabase.from("disciplinary_records").select("id, action_taken, hr_review_status, md_decision, incident_date").eq("organization_id", orgId).limit(200),
        industrialDb.from("hr_salary_schedules").select("id, gross_salary, net_pay, status, period_start, period_end").eq("organization_id", orgId).limit(200),
        industrialDb.from("hr_overtime_entries").select("id, overtime_earnings, status, period_month").eq("organization_id", orgId).limit(200),
        industrialDb.from("hr_staff_loans").select("id, outstanding_balance, status").eq("organization_id", orgId).limit(200),
        industrialDb.from("hr_hmo_enrolments").select("id, coverage_start, coverage_end, amount, status").eq("organization_id", orgId).limit(200),
        industrialDb.from("hr_external_loans").select("id, remaining_balance, status").eq("organization_id", orgId).limit(200),
        industrialDb.from("vat_schedule_entries").select("id, entry_date, output_vat, input_vat, withholding_tax, vat_payable, total_vat_credit_payable").eq("organization_id", orgId).limit(500),
        industrialDb.from("finance_accounts").select("id, account_name, account_type, currency, is_active").eq("organization_id", orgId).eq("is_active", true).limit(100),
        industrialDb.from("bank_statements").select("id, account_id, closing_balance, period_end, imported_at, status").eq("organization_id", orgId).order("imported_at", { ascending: false }).limit(200),
        industrialDb.from("bank_transactions").select("id, amount, direction, review_status, transaction_date").eq("organization_id", orgId).limit(500),
        industrialDb.from("finance_reconciliations").select("id, status, difference, period_end").eq("organization_id", orgId).limit(100),
        industrialDb.from("invoices").select("id, status, total_amount, balance_due, amount_paid, invoice_date").eq("organization_id", orgId).limit(500),
        supabase.from("receipts").select("amount_received, created_at").eq("organization_id", orgId).limit(500),
        industrialDb.from("expenses").select("amount, date, expense_scope, category").eq("organization_id", orgId).limit(500),
        industrialDb.from("purchase_orders").select("id, status, total_amount, amount_paid, outstanding_amount, payment_status, procurement_mode, exchange_rate, site_reference, currency, created_at").eq("organization_id", orgId).limit(500),
        industrialDb.rpc("get_finance_period_report", { _org_id: orgId, _from: from, _to: to }),
      ]);
      const results = [membersResult, leavesResult, disciplinaryResult, salariesResult, overtimeResult, loansResult, hmoResult, externalLoansResult, vatResult, accountsResult, statementsResult, bankLinesResult, reconciliationsResult, invoicesResult, receiptsResult, expensesResult, purchaseOrdersResult, financeReportResult];
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;

      const members = (membersResult.data ?? []) as RawRow[];
      const leaves = (leavesResult.data ?? []) as RawRow[];
      const disciplinary = (disciplinaryResult.data ?? []) as RawRow[];
      const salaries = (salariesResult.data ?? []) as RawRow[];
      const overtime = (overtimeResult.data ?? []) as RawRow[];
      const loans = (loansResult.data ?? []) as RawRow[];
      const hmo = (hmoResult.data ?? []) as RawRow[];
      const externalLoans = (externalLoansResult.data ?? []) as RawRow[];
      const vat = (vatResult.data ?? []) as RawRow[];
      const accounts = (accountsResult.data ?? []) as RawRow[];
      const statements = (statementsResult.data ?? []) as RawRow[];
      const bankLines = (bankLinesResult.data ?? []) as RawRow[];
      const reconciliations = (reconciliationsResult.data ?? []) as RawRow[];
      const invoices = (invoicesResult.data ?? []) as RawRow[];
      const receipts = (receiptsResult.data ?? []) as RawRow[];
      const expenses = (expensesResult.data ?? []) as RawRow[];
      const purchaseOrders = (purchaseOrdersResult.data ?? []) as RawRow[];
      const report = (financeReportResult.data ?? {}) as FinanceReport;

      const pendingLeaves = leaves.filter((row) => String(row.status) === "pending");
      const currentlyOnLeave = leaves.filter((row) => String(row.status) === "approved" && String(row.start_date) <= to && String(row.end_date) >= to);
      const openDisciplinary = disciplinary.filter((row) => !String(row.action_taken ?? "").trim() || row.hr_review_status === "pending" || row.md_decision === "pending");
      const payrollRows = salaries.filter((row) => isInPeriod(row.period_start, from, to));
      const overtimeRows = overtime.filter((row) => isInPeriod(row.period_month, from, to));
      const pendingPayroll = payrollRows.filter((row) => isPendingPayrollStatus(row.status));
      const pendingOvertime = overtimeRows.filter((row) => isPendingPayrollStatus(row.status));
      const activeLoans = loans.filter((row) => row.status === "active");
      const activeHmo = hmo.filter((row) => row.status === "active" && String(row.coverage_start) <= to && String(row.coverage_end) >= to);
      const activeExternalLoans = externalLoans.filter((row) => !["completed", "cancelled"].includes(String(row.status)));
      const operationalInvoices = invoices.filter((row) => isOperationalInvoice(row) && isInPeriod(row.invoice_date, from, to));
      const unpaidInvoices = operationalInvoices.filter((row) => numberValue(row.balance_due) > 0);
      const reportAging = report.aging ?? {};
      const agingReceivables = ["current", "1_30", "31_60", "61_90", "90_plus"].reduce((sum, key) => sum + numberValue(reportAging[key]), 0);
      const totalInvoiceValue = operationalInvoices.reduce((sum, row) => sum + numberValue(row.total_amount), 0);
      const fallbackReceived = receipts.filter((row) => isInPeriod(row.created_at, from, to)).reduce((sum, row) => sum + numberValue(row.amount_received), 0);
      const fallbackExpenses = expenses.filter((row) => isInPeriod(row.date, from, to)).reduce((sum, row) => sum + numberValue(row.amount), 0);
      const incomeReceived = report.collected == null ? fallbackReceived : numberValue(report.collected);
      const operatingExpenses = report.operating_expenses == null ? fallbackExpenses : numberValue(report.operating_expenses);
      const workerPayments = numberValue(report.worker_payments);
      const cancelledReceivables = invoices.filter((row) => ["cancelled", "void"].includes(String(row.status).toLowerCase()) && isInPeriod(row.invoice_date, from, to)).reduce((sum, row) => sum + numberValue(row.balance_due ?? row.total_amount), 0);
      const receivables = report.aging ? Math.max(0, agingReceivables - cancelledReceivables) : unpaidInvoices.reduce((sum, row) => sum + numberValue(row.balance_due), 0);

      const accountMap = new Map(accounts.map((row) => [String(row.id), row]));
      const latestStatements = new Map<string, RawRow>();
      [...statements].sort((a, b) => String(b.imported_at ?? b.period_end ?? "").localeCompare(String(a.imported_at ?? a.period_end ?? ""))).forEach((row) => { const accountId = String(row.account_id); if (!latestStatements.has(accountId)) latestStatements.set(accountId, row); });
      const ngnStatementValue = (accountType?: string) => [...latestStatements.entries()].reduce((sum, [accountId, statement]) => { const account = accountMap.get(accountId); if (!account || (account.currency && account.currency !== "NGN") || (accountType && account.account_type !== accountType)) return sum; return sum + numberValue(statement.closing_balance); }, 0);
      const latestBankPosition = ngnStatementValue();
      const pettyCashPosition = ngnStatementValue("cash");

      const openPurchaseOrders = purchaseOrders.filter((row) => !["closed", "cancelled", "received"].includes(String(row.status).toLowerCase()));
      const poOutstanding = (row: RawRow) => numberValue(row.outstanding_amount ?? (numberValue(row.total_amount) + numberValue(row.vat_amount) + numberValue(row.haulage_cost) - numberValue(row.amount_paid)));
      const supplierObligations = openPurchaseOrders.reduce((sum, row) => sum + poOutstanding(row), 0);
      const procurementPaid = purchaseOrders.filter((row) => isInPeriod(row.created_at, from, to)).reduce((sum, row) => sum + numberValue(row.amount_paid), 0);
      const importExposure = openPurchaseOrders.filter((row) => row.procurement_mode === "import").reduce((sum, row) => sum + poOutstanding(row), 0);
      const forexExposure = openPurchaseOrders.filter((row) => row.procurement_mode === "forex" || row.exchange_rate != null).reduce((sum, row) => sum + poOutstanding(row), 0);
      const periodExpenses = expenses.filter((row) => isInPeriod(row.date, from, to));
      const siteExpenses = periodExpenses.filter((row) => row.expense_scope === "site").reduce((sum, row) => sum + numberValue(row.amount), 0);
      const administrativeExpenses = periodExpenses.filter((row) => row.expense_scope === "administrative").reduce((sum, row) => sum + numberValue(row.amount), 0);
      const pendingBankLines = bankLines.filter((row) => ["pending_review", "suggested"].includes(String(row.review_status)));
      const reconciliationExceptions = reconciliations.filter((row) => ["open", "exception", "in_review"].includes(String(row.status))).length;
      const trend = (report.monthly ?? []).slice(-6).map((row) => ({ month: row.month, income: numberValue(row.collected ?? row.invoiced), spending: numberValue(row.expenses) + numberValue(row.worker_payments) }));
      const pendingHrActions = pendingLeaves.length + openDisciplinary.length + pendingPayroll.length + pendingOvertime.length;

      return {
        staffCount: members.length,
        pendingLeaves: pendingLeaves.length,
        currentlyOnLeave: currentlyOnLeave.length,
        openDisciplinary: openDisciplinary.length,
        pendingHrActions,
        payrollGross: payrollRows.reduce((sum, row) => sum + numberValue(row.gross_salary), 0),
        payrollNet: payrollRows.reduce((sum, row) => sum + numberValue(row.net_pay), 0),
        pendingPayrollNet: pendingPayroll.reduce((sum, row) => sum + numberValue(row.net_pay), 0),
        paidPayrollNet: payrollRows.filter((row) => row.status === "paid").reduce((sum, row) => sum + numberValue(row.net_pay), 0),
        overtimeTotal: overtimeRows.reduce((sum, row) => sum + numberValue(row.overtime_earnings), 0),
        pendingOvertime: pendingOvertime.reduce((sum, row) => sum + numberValue(row.overtime_earnings), 0),
        paidOvertime: overtimeRows.filter((row) => row.status === "paid").reduce((sum, row) => sum + numberValue(row.overtime_earnings), 0),
        staffLoansOutstanding: activeLoans.reduce((sum, row) => sum + numberValue(row.outstanding_balance), 0),
        activeHmoCount: activeHmo.length,
        activeHmoCost: activeHmo.reduce((sum, row) => sum + numberValue(row.amount), 0),
        latestBankPosition,
        pettyCashPosition,
        incomeReceived,
        totalExpenses: operatingExpenses + workerPayments,
        receivables,
        unpaidInvoiceCount: unpaidInvoices.length,
        totalInvoiceValue,
        supplierObligations,
        procurementPaid,
        vatPayable: vat.filter((row) => isInPeriod(row.entry_date, from, to)).reduce((sum, row) => sum + numberValue(row.vat_payable), 0),
        outputVat: vat.filter((row) => isInPeriod(row.entry_date, from, to)).reduce((sum, row) => sum + numberValue(row.output_vat), 0),
        inputVat: vat.filter((row) => isInPeriod(row.entry_date, from, to)).reduce((sum, row) => sum + numberValue(row.input_vat), 0),
        withholdingTax: vat.filter((row) => isInPeriod(row.entry_date, from, to)).reduce((sum, row) => sum + numberValue(row.withholding_tax), 0),
        externalLoansOutstanding: activeExternalLoans.reduce((sum, row) => sum + numberValue(row.remaining_balance), 0),
        siteExpenses,
        administrativeExpenses,
        importExposure,
        forexExposure,
        pendingBankReview: pendingBankLines.length,
        pendingBankAmount: pendingBankLines.reduce((sum, row) => sum + numberValue(row.amount), 0),
        reconciliationExceptions,
        trend,
      };
    },
    enabled: !!orgId && canView,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  if (!canView) return null;
  if (isLoading) return <Card className="border-primary/20 bg-primary/[0.03]"><CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" /> Loading today’s connected figures…</CardContent></Card>;
  if (error || !data) return <Card className="border-destructive/30 bg-destructive/[0.03]"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-destructive" /> Today’s figures are unavailable</CardTitle><CardDescription>Live source records could not be loaded. No placeholder totals are shown.</CardDescription></CardHeader><CardContent><Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="mr-1 h-3.5 w-3.5" />Retry</Button></CardContent></Card>;

  const attention = [
    ...(data.pendingLeaves > 0 ? [{ label: `${data.pendingLeaves} leave request${data.pendingLeaves === 1 ? "" : "s"} need review`, detail: "Open the leave inbox", href: "/hr?tab=leaves", tone: "warning" as const }] : []),
    ...(data.openDisciplinary > 0 ? [{ label: `${data.openDisciplinary} disciplinary matter${data.openDisciplinary === 1 ? "" : "s"} open`, detail: "Review HR decisions", href: "/hr?tab=disciplinary", tone: "danger" as const }] : []),
    ...(data.pendingPayrollNet > 0 || data.pendingOvertime > 0 ? [{ label: "Payroll action is waiting", detail: `${formatCurrency(data.pendingPayrollNet + data.pendingOvertime)} scheduled for review`, href: "/hr?tab=payroll", tone: "warning" as const }] : []),
    ...(data.pendingBankReview > 0 ? [{ label: `${data.pendingBankReview} bank line${data.pendingBankReview === 1 ? "" : "s"} pending review`, detail: formatCurrency(data.pendingBankAmount), href: "/finance?tab=bank-analysis", tone: "warning" as const }] : []),
    ...(data.reconciliationExceptions > 0 ? [{ label: `${data.reconciliationExceptions} reconciliation item${data.reconciliationExceptions === 1 ? "" : "s"} need attention`, detail: "Open bank analysis", href: "/finance?tab=bank-analysis", tone: "danger" as const }] : []),
  ];

  return <div className="space-y-4">
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-base sm:text-lg"><WalletCards className="h-5 w-5 text-primary" /> HR + Finance at a glance</CardTitle><CardDescription className="mt-1 max-w-3xl leading-5">Start here for today’s people, payroll, cash, and follow-up picture. Open a linked figure only when you need to investigate or change a record.</CardDescription></div><Button variant="outline" size="sm" className="shrink-0" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`mr-1 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />Refresh</Button></CardHeader>
      <CardContent className="pt-0"><p className="text-[11px] text-muted-foreground">Live organization-scoped figures · Finance window: last 12 months</p></CardContent>
    </Card>

    <section aria-labelledby="hr-finance-attention" className="space-y-2"><div className="flex items-center justify-between gap-3"><div><h2 id="hr-finance-attention" className="text-sm font-semibold">What needs attention</h2><p className="text-xs text-muted-foreground">Only items that need a decision are shown here.</p></div><span className="text-xs text-muted-foreground">{attention.length} open</span></div>{attention.length > 0 ? <div className="grid gap-2 md:grid-cols-2">{attention.map((item) => <AttentionItem key={item.label} {...item} />)}</div> : <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2.5 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />No urgent HR or Finance actions are waiting.</div>}</section>

    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Today’s picture</CardTitle><CardDescription>Four numbers for the people decisions and four for the financial position.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4 sm:divide-x sm:divide-border/60"><SummaryMetric label="People" value={data.staffCount} detail="In this organization" href="/hr?tab=idcards" icon={Users} /><SummaryMetric label="Leave to review" value={data.pendingLeaves} detail="Pending requests" href="/hr?tab=leaves" icon={CalendarDays} tone={data.pendingLeaves > 0 ? "warning" : "default"} /><SummaryMetric label="Payroll scheduled" value={formatCurrency(data.payrollNet)} detail="Net in last 12 months" href="/hr?tab=payroll" icon={Banknote} /><SummaryMetric label="Currently on leave" value={data.currentlyOnLeave} detail="Approved leave covering today" href="/hr?tab=leaves" icon={CalendarDays} /></div>
        <div className="border-t border-border/60 pt-3"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Financial position</p><div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4 sm:divide-x sm:divide-border/60"><SummaryMetric label="Bank position" value={formatCurrency(data.latestBankPosition)} detail="Latest statement balance" href="/finance?tab=bank-analysis" icon={Landmark} /><SummaryMetric label="Income received" value={formatCurrency(data.incomeReceived)} detail="Collected in the period" href="/finance?tab=receipts" icon={TrendingUp} tone="success" /><SummaryMetric label="Client receivables" value={formatCurrency(data.receivables)} detail={`${data.unpaidInvoiceCount} unpaid or part-paid`} href="/finance?tab=invoices" icon={ReceiptText} tone={data.receivables > 0 ? "warning" : "default"} /><SummaryMetric label="Supplier obligations" value={formatCurrency(data.supplierObligations)} detail="Open purchase orders" href="/procurement" icon={ShoppingCart} tone={data.supplierObligations > 0 ? "warning" : "default"} /></div></div>
      </CardContent>
    </Card>

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]"><Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-primary" /> Financial movement</CardTitle><CardDescription>Income received versus spending. It stays quiet until there is activity to interpret.</CardDescription></CardHeader><CardContent><TrendBars points={data.trend} /></CardContent></Card><Collapsible defaultOpen={false} className="rounded-xl border bg-card"><div className="flex items-start justify-between gap-3 p-4"><div><h2 className="text-base font-semibold">More finance details</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Tax, loans, expenses, and review queues when you need a deeper check.</p></div><CollapsibleTrigger asChild><Button variant="outline" size="sm" className="shrink-0">View details<ChevronDown className="ml-1 h-3.5 w-3.5" /></Button></CollapsibleTrigger></div><CollapsibleContent className="border-t border-border/60"><div className="grid grid-cols-2 gap-2 p-4 text-sm"><Link to="/finance?tab=expenses" className="rounded-lg border p-2.5 hover:border-primary/40"><p className="text-[11px] text-muted-foreground">Total expenses</p><p className="mt-1 font-semibold">{formatCurrency(data.totalExpenses)}</p></Link><Link to="/finance?tab=bank-analysis" className="rounded-lg border p-2.5 hover:border-primary/40"><p className="text-[11px] text-muted-foreground">Bank review</p><p className="mt-1 font-semibold">{data.pendingBankReview} · {formatCurrency(data.pendingBankAmount)}</p></Link><Link to="/hr?tab=payroll" className="rounded-lg border p-2.5 hover:border-primary/40"><p className="text-[11px] text-muted-foreground">VAT payable</p><p className="mt-1 font-semibold">{formatCurrency(data.vatPayable)}</p></Link><Link to="/hr?tab=payroll" className="rounded-lg border p-2.5 hover:border-primary/40"><p className="text-[11px] text-muted-foreground">Staff loans</p><p className="mt-1 font-semibold">{formatCurrency(data.staffLoansOutstanding)}</p></Link><Link to="/hr?tab=payroll" className="rounded-lg border p-2.5 hover:border-primary/40"><p className="text-[11px] text-muted-foreground">HMO coverage</p><p className="mt-1 font-semibold">{data.activeHmoCount} · {formatCurrency(data.activeHmoCost)}</p></Link><Link to="/procurement" className="rounded-lg border p-2.5 hover:border-primary/40"><p className="text-[11px] text-muted-foreground">Import / forex</p><p className="mt-1 font-semibold">{formatCurrency(data.importExposure + data.forexExposure)}</p></Link></div></CollapsibleContent></Collapsible></div>

    <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Figures refresh on focus, every minute, and after connected module changes.</p>
  </div>;
}
