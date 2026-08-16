import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CalendarClock, CreditCard, FileDown, FileSpreadsheet, HeartPulse, Landmark, Loader2, Plus, ReceiptText, Settings2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/constants";
import { humanizeError } from "@/lib/humanizeError";
import { industrialDb } from "@/lib/industrialDb";
import { calculateVatSchedule } from "@/lib/financialMath";
import { calculateNigerianSalary } from "@/lib/payroll";
import { generatePdf } from "@/lib/generatePdf";
import { NIGERIAN_STATES, lgasForState } from "@/lib/nigeriaLocations";

type Member = { user_id: string; role: string };
type WorkspaceProps = {
  orgId?: string;
  userId?: string;
  members: Member[];
  profileMap: Map<string, { full_name?: string | null; account_number?: string | null }>;
  activeRole?: string;
};

type FormState = Record<string, string>;
const blank = (values: FormState): FormState => values;
const today = () => new Date().toISOString().slice(0, 10);

export function HRFinanceWorkspace({ orgId, userId, members, profileMap, activeRole }: WorkspaceProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [accountOpen, setAccountOpen] = useState(false);
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [overtimeOpen, setOvertimeOpen] = useState(false);
  const [loanOpen, setLoanOpen] = useState(false);
  const [hmoOpen, setHmoOpen] = useState(false);
  const [vatOpen, setVatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [repaymentOpen, setRepaymentOpen] = useState(false);
  const [repaymentLoanId, setRepaymentLoanId] = useState("");
  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [repaymentDate, setRepaymentDate] = useState(today());
  const [repaymentNotes, setRepaymentNotes] = useState("");
  const [account, setAccount] = useState(blank({ name: "", type: "bank", number: "", currency: "NGN" }));
  const [salary, setSalary] = useState(blank({ employee: "", start: today().slice(0, 8) + "01", end: today(), bank: "none", accountNumber: "", gross: "", voluntary: "", deductions: "", loan: "", notes: "" }));
  const [overtime, setOvertime] = useState(blank({ employee: "", month: today().slice(0, 7) + "-01", gross: "", workingDays: "", days: "", bank: "none", accountNumber: "", notes: "" }));
  const [loan, setLoan] = useState(blank({ employee: "", amount: "", additional: "", months: "", start: today(), bank: "none", notes: "" }));
  const [hmo, setHmo] = useState(blank({ employee: "", start: today(), end: "", classification: "individual", amount: "", bank: "none" }));
  const [vat, setVat] = useState(blank({ date: today(), clientName: "", tin: "", state: "", lga: "", gross: "", outputVat: "", inputVat: "", withholding: "", vatWithheld: "", vatPaid: "", penalty: "", interest: "", broughtForward: "", lrp: "", freeTradeZone: "false", sourceType: "", sourceId: "", note: "" }));
  const [mdApprover, setMdApprover] = useState("");
  const [workingDays, setWorkingDays] = useState("");

  const memberName = (id: string) => profileMap.get(id)?.full_name ?? "Unknown employee";
  const memberOptions = members.map((member) => ({ value: member.user_id, label: memberName(member.user_id) })).sort((a, b) => a.label.localeCompare(b.label));

  const { data: workflowSettings } = useQuery({
    queryKey: ["hr-finance-workflow-settings", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await industrialDb.from("hr_workflow_settings").select("md_approver_id, working_days_per_month").eq("organization_id", orgId).maybeSingle();
      if (error) throw error;
      return data as { md_approver_id?: string | null; working_days_per_month?: number | null } | null;
    },
    enabled: !!orgId,
  });
  useEffect(() => {
    if (workflowSettings) {
      setMdApprover(workflowSettings.md_approver_id ?? "");
      setWorkingDays(workflowSettings.working_days_per_month?.toString() ?? "");
    }
  }, [workflowSettings]);
  const { data: accounts = [] } = useQuery({
    queryKey: ["hr-finance-accounts", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await industrialDb.from("finance_accounts").select("*").eq("organization_id", orgId).order("account_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
  const { data: salarySchedules = [] } = useQuery({
    queryKey: ["hr-salary-schedules", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await industrialDb.from("hr_salary_schedules").select("*").eq("organization_id", orgId).order("period_start", { ascending: false }).limit(30);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
  const { data: overtimeEntries = [] } = useQuery({
    queryKey: ["hr-overtime", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await industrialDb.from("hr_overtime_entries").select("*").eq("organization_id", orgId).order("period_month", { ascending: false }).limit(30);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
  const { data: loans = [] } = useQuery({
    queryKey: ["hr-staff-loans", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await industrialDb.from("hr_staff_loans").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
  const { data: hmoEntries = [] } = useQuery({
    queryKey: ["hr-hmo", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await industrialDb.from("hr_hmo_enrolments").select("*").eq("organization_id", orgId).order("coverage_start", { ascending: false }).limit(30);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });
  const { data: vatEntries = [] } = useQuery({
    queryKey: ["vat-schedule", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await industrialDb.from("vat_schedule_entries").select("*").eq("organization_id", orgId).order("entry_date", { ascending: false }).limit(30);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!orgId || !userId) throw new Error("Your organization session is not ready.");
      const { error } = await industrialDb.from("hr_workflow_settings").upsert({ organization_id: orgId, md_approver_id: mdApprover || null, working_days_per_month: workingDays ? Number(workingDays) : null, updated_by: userId });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "HR workflow settings saved" }); setSettingsOpen(false); queryClient.invalidateQueries({ queryKey: ["hr-finance-workflow-settings", orgId] }); queryClient.invalidateQueries({ queryKey: ["hr-workflow-settings", orgId] }); },
    onError: (error) => toast({ title: "Could not save HR settings", description: humanizeError(error), variant: "destructive" }),
  });
  const saveRecord = useMutation({
    mutationFn: async ({ table, payload }: { table: string; payload: Record<string, unknown> }) => {
      if (!orgId || !userId) throw new Error("Your organization session is not ready.");
      const { error } = await industrialDb.from(table).insert({ organization_id: orgId, ...payload });
      if (error) throw error;
    },
    onError: (error) => toast({ title: "Could not save record", description: humanizeError(error), variant: "destructive" }),
  });

  const refresh = (keys: string[]) => keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key, orgId] }));
  const saveAccount = () => saveRecord.mutate({ table: "finance_accounts", payload: { account_name: account.name.trim(), account_type: account.type, account_number: account.number.trim() || null, currency: account.currency || "NGN", is_active: true, created_by: userId } }, { onSuccess: () => { toast({ title: "Finance account added" }); setAccountOpen(false); setAccount(blank({ name: "", type: "bank", number: "", currency: "NGN" })); refresh(["hr-finance-accounts"]); } });
  const payrollBreakdown = calculateNigerianSalary(Number(salary.gross || 0));
  const salaryNet = Math.max(0, payrollBreakdown.netPay - Number(salary.voluntary || 0) - Number(salary.deductions || 0) - Number(salary.loan || 0));
  const saveSalary = () => saveRecord.mutate({ table: "hr_salary_schedules", payload: { employee_id: salary.employee, period_start: salary.start, period_end: salary.end, bank_account_id: salary.bank === "none" ? null : salary.bank, account_number: salary.accountNumber || null, gross_salary: Number(salary.gross || 0), pension: payrollBreakdown.pensionEmployee, nhf: payrollBreakdown.nhf, voluntary_contribution: Number(salary.voluntary || 0), tax: payrollBreakdown.paye, deductions: Number(salary.deductions || 0), loan_repayment: Number(salary.loan || 0), net_pay: salaryNet, status: "submitted", submitted_by: userId, notes: salary.notes.trim() || "Calculated from Nigerian payroll breakdown" } }, { onSuccess: () => { toast({ title: "Salary schedule submitted" }); setSalaryOpen(false); refresh(["hr-salary-schedules"]); } });
  const overtimeDaily = Number(overtime.gross || 0) / Math.max(1, Number(overtime.workingDays || 0));
  const overtimeEarnings = overtimeDaily * Number(overtime.days || 0);
  const saveOvertime = () => saveRecord.mutate({ table: "hr_overtime_entries", payload: { employee_id: overtime.employee, period_month: overtime.month, monthly_gross: Number(overtime.gross || 0), working_days_basis: Number(overtime.workingDays || 0) || null, daily_rate: overtimeDaily, overtime_days: Number(overtime.days || 0), overtime_earnings: overtimeEarnings, bank_account_id: overtime.bank === "none" ? null : overtime.bank, account_number: overtime.accountNumber || null, notes: overtime.notes.trim() || "Calculated overtime schedule", status: "submitted", submitted_by: userId } }, { onSuccess: () => { toast({ title: "Overtime submitted" }); setOvertimeOpen(false); refresh(["hr-overtime"]); } });
  const loanMonthly = (Number(loan.amount || 0) + Number(loan.additional || 0)) / Math.max(1, Number(loan.months || 0));
  const saveLoan = () => saveRecord.mutate({ table: "hr_staff_loans", payload: { employee_id: loan.employee, amount: Number(loan.amount || 0), additional_loan: Number(loan.additional || 0), repayment_period_months: Number(loan.months || 0), start_date: loan.start, bank_account_id: loan.bank === "none" ? null : loan.bank, monthly_repayment: loanMonthly, outstanding_balance: Number(loan.amount || 0) + Number(loan.additional || 0), status: "active", approved_by: userId, created_by: userId, notes: loan.notes || null } }, { onSuccess: () => { toast({ title: "Staff loan recorded" }); setLoanOpen(false); refresh(["hr-staff-loans"]); } });
  const saveHmo = () => saveRecord.mutate({ table: "hr_hmo_enrolments", payload: { employee_id: hmo.employee, coverage_start: hmo.start, coverage_end: hmo.end, family_classification: hmo.classification, amount: Number(hmo.amount || 0), bank_account_id: hmo.bank === "none" ? null : hmo.bank, status: "active", updated_by: userId } }, { onSuccess: () => { toast({ title: "HMO enrolment saved" }); setHmoOpen(false); refresh(["hr-hmo"]); } });
  const vatSchedule = calculateVatSchedule({ grossAmount: Number(vat.gross || 0), outputVat: Number(vat.outputVat || 0), inputVat: Number(vat.inputVat || 0), vatWithheld: Number(vat.vatWithheld || vat.withholding || 0), vatPaid: Number(vat.vatPaid || 0), penalty: Number(vat.penalty || 0), interest: Number(vat.interest || 0), broughtForward: Number(vat.broughtForward || 0), lrp: Number(vat.lrp || 0) });
  const vatNet = vatSchedule.netAmount;
  const vatTotal = vatSchedule.totalCreditPayable;
  const saveVat = () => { if (!orgId) return; saveVatEntry.mutate(); };
  const saveVatEntry = useMutation({ mutationFn: async () => { if (!orgId) throw new Error("Organization is not ready"); const { error } = await industrialDb.rpc("create_vat_schedule_entry", { _org_id: orgId, _entry_date: vat.date, _client_tin: vat.tin.trim() || null, _client_name: vat.clientName.trim(), _gross_amount: vatSchedule.grossAmount, _output_vat: vatSchedule.outputVat, _input_vat: vatSchedule.inputVat, _withholding_tax: Number(vat.withholding || 0), _vat_withheld: vatSchedule.vatWithheld, _vat_paid: vatSchedule.vatPaid, _penalty: vatSchedule.penalty, _interest: vatSchedule.interest, _brought_forward: vatSchedule.broughtForward, _lrp: vatSchedule.lrp, _state: vat.state || null, _local_government: vat.lga.trim() || null, _free_trade_zone: vat.freeTradeZone === "true", _source_entity_type: vat.sourceType || null, _source_entity_id: vat.sourceId.trim() || null, _note: vat.note.trim() || null }); if (error) throw error; }, onSuccess: () => { toast({ title: "VAT schedule entry saved" }); setVatOpen(false); refresh(["vat-schedule"]); }, onError: (error) => toast({ title: "Could not save VAT entry", description: humanizeError(error), variant: "destructive" }) });

  const canApprove = activeRole === "administrator" || activeRole === "finance" || activeRole === "hr";
  const approveSalary = useMutation({ mutationFn: async (id: string) => { if (!orgId) throw new Error("Organization is not ready"); const { error } = await industrialDb.rpc("approve_salary_schedule", { _org_id: orgId, _schedule_id: id }); if (error) throw error; }, onSuccess: () => { toast({ title: "Salary schedule approved" }); refresh(["hr-salary-schedules"]); }, onError: (error) => toast({ title: "Could not approve salary", description: humanizeError(error), variant: "destructive" }) });
  const paySalary = useMutation({ mutationFn: async (id: string) => { if (!orgId) throw new Error("Organization is not ready"); const { error } = await industrialDb.rpc("create_worker_payment_from_salary_schedule", { _org_id: orgId, _schedule_id: id }); if (error) throw error; }, onSuccess: () => { toast({ title: "Salary payment created" }); refresh(["hr-salary-schedules"]); queryClient.invalidateQueries({ queryKey: ["salary-payments", orgId] }); queryClient.invalidateQueries({ queryKey: ["finance-payments", orgId] }); }, onError: (error) => toast({ title: "Could not create salary payment", description: humanizeError(error), variant: "destructive" }) });
  const approveOvertime = useMutation({ mutationFn: async (id: string) => { if (!orgId) throw new Error("Organization is not ready"); const { error } = await industrialDb.rpc("approve_overtime_entry", { _org_id: orgId, _entry_id: id }); if (error) throw error; }, onSuccess: () => { toast({ title: "Overtime approved" }); refresh(["hr-overtime"]); }, onError: (error) => toast({ title: "Could not approve overtime", description: humanizeError(error), variant: "destructive" }) });
  const payOvertime = useMutation({ mutationFn: async (id: string) => { if (!orgId) throw new Error("Organization is not ready"); const { error } = await industrialDb.rpc("create_worker_payment_from_overtime", { _org_id: orgId, _entry_id: id }); if (error) throw error; }, onSuccess: () => { toast({ title: "Overtime payment created" }); refresh(["hr-overtime"]); queryClient.invalidateQueries({ queryKey: ["salary-payments", orgId] }); queryClient.invalidateQueries({ queryKey: ["finance-payments", orgId] }); }, onError: (error) => toast({ title: "Could not create overtime payment", description: humanizeError(error), variant: "destructive" }) });
  const repayLoan = useMutation({ mutationFn: async () => { if (!orgId || !repaymentLoanId) throw new Error("Select a loan"); const { error } = await industrialDb.rpc("record_staff_loan_repayment", { _org_id: orgId, _loan_id: repaymentLoanId, _amount: Number(repaymentAmount), _payment_date: repaymentDate, _notes: repaymentNotes.trim() || null }); if (error) throw error; }, onSuccess: () => { toast({ title: "Loan repayment recorded" }); setRepaymentOpen(false); setRepaymentAmount(""); setRepaymentNotes(""); refresh(["hr-staff-loans"]); queryClient.invalidateQueries({ queryKey: ["salary-payments", orgId] }); queryClient.invalidateQueries({ queryKey: ["finance-payments", orgId] }); }, onError: (error) => toast({ title: "Could not record repayment", description: humanizeError(error), variant: "destructive" }) });
  const generatePayslip = (row: { employee_id: string; period_start: string; period_end: string; gross_salary: number; net_pay: number; pension: number; nhf?: number | null; voluntary_contribution: number; tax: number; deductions: number; loan_repayment: number }) => {
    generatePdf({ title: "Employee Payslip", documentId: `PAY-${row.employee_id.slice(0, 8)}-${row.period_start}`, companyName: "NIF Technical Company", stampType: "hr", watermark: "PAYSLIP", contentSections: [{ heading: "Employee and period", bullets: [`Employee: ${memberName(row.employee_id)}`, `Period: ${row.period_start} to ${row.period_end}`] }], tableData: { columns: [{ header: "Component", dataKey: "component" }, { header: "Amount", dataKey: "amount" }], rows: [{ component: "Gross salary", amount: formatCurrency(Number(row.gross_salary)) }, { component: "Employee pension", amount: formatCurrency(Number(row.pension)) }, { component: "NHF", amount: formatCurrency(Number(row.nhf ?? 0)) }, { component: "Voluntary contribution", amount: formatCurrency(Number(row.voluntary_contribution)) }, { component: "Tax", amount: formatCurrency(Number(row.tax)) }, { component: "Other deductions", amount: formatCurrency(Number(row.deductions)) }, { component: "Loan repayment", amount: formatCurrency(Number(row.loan_repayment)) }], summary: [{ label: "Net payable", value: formatCurrency(Number(row.net_pay)) }] } });
  };
  const actionDisabled = saveRecord.isPending || !orgId || !userId;
  const field = (state: FormState, setter: (value: FormState) => void, key: string, label: string, type = "text", placeholder = "") => <div className="space-y-1"><Label>{label}</Label><Input type={type} value={state[key] ?? ""} placeholder={placeholder} onChange={(event) => setter({ ...state, [key]: event.target.value })} /></div>;
  const memberSelect = (state: FormState, setter: (value: FormState) => void) => <div className="space-y-1"><Label>Employee *</Label><Select value={state.employee} onValueChange={(value) => setter({ ...state, employee: value })}><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{memberOptions.map((member) => <SelectItem key={member.value} value={member.value}>{member.label}</SelectItem>)}</SelectContent></Select></div>;
  const accountSelect = (state: FormState, setter: (value: FormState) => void) => <div className="space-y-1"><Label>Money source</Label><Select value={state.bank} onValueChange={(value) => setter({ ...state, bank: value })}><SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger><SelectContent><SelectItem value="none">Not assigned</SelectItem>{accounts.map((item) => <SelectItem key={item.id} value={item.id}>{item.account_name}{item.account_number ? ` · ${item.account_number}` : ""}</SelectItem>)}</SelectContent></Select></div>;

  return <Card className="border-primary/20 bg-primary/[0.03]">
    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Finance & Benefits Workspace</CardTitle><p className="text-xs text-muted-foreground">HR-owned schedules and finance oversight stay connected to Finance, worker payments, documents, and reporting.</p></CardHeader>
    <CardContent>
      <Tabs defaultValue="salary" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto bg-transparent p-0 gap-1 scrollbar-hide">
          <TabsTrigger value="salary">Salary & Overtime</TabsTrigger><TabsTrigger value="loans">Loans</TabsTrigger><TabsTrigger value="benefits">HMO</TabsTrigger><TabsTrigger value="accounts">Accounts</TabsTrigger><TabsTrigger value="vat">VAT Schedule</TabsTrigger>
        </TabsList>
        <TabsContent value="salary" className="space-y-4">
          <div className="flex flex-wrap gap-2"><Dialog open={salaryOpen} onOpenChange={setSalaryOpen}><DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Salary schedule</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Submit salary schedule row</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2">{memberSelect(salary, setSalary)}{accountSelect(salary, setSalary)}{field(salary, setSalary, "start", "Period start", "date")}{field(salary, setSalary, "end", "Period end", "date")}{field(salary, setSalary, "gross", "Gross salary", "number")}{field(salary, setSalary, "voluntary", "Voluntary contribution", "number")}{field(salary, setSalary, "deductions", "Other deductions", "number")}{field(salary, setSalary, "loan", "Loan repayment", "number")}{field(salary, setSalary, "accountNumber", "Employee account number")}{field(salary, setSalary, "notes", "Schedule note", "text", "UAT payroll statutory calculation") }<div className="sm:col-span-2 rounded-lg border bg-muted/30 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Calculated Nigerian payroll</p><div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><span>Employee pension <strong>{formatCurrency(payrollBreakdown.pensionEmployee)}</strong></span><span>NHF <strong>{formatCurrency(payrollBreakdown.nhf)}</strong></span><span>PAYE <strong>{formatCurrency(payrollBreakdown.paye)}</strong></span><span>Employer pension <strong>{formatCurrency(payrollBreakdown.pensionEmployer)}</strong></span></div></div></div><p className="text-sm font-semibold text-primary">Net payable: {formatCurrency(salaryNet)}</p><Button onClick={saveSalary} disabled={actionDisabled || !salary.employee || !salary.start || !salary.end || Number(salary.gross) <= 0}>Submit for approval</Button></DialogContent></Dialog><Dialog open={overtimeOpen} onOpenChange={setOvertimeOpen}><DialogTrigger asChild><Button size="sm" variant="outline"><CalendarClock className="h-4 w-4 mr-1" />Overtime</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Submit overtime</DialogTitle></DialogHeader><div className="space-y-3">{memberSelect(overtime, setOvertime)}{field(overtime, setOvertime, "month", "Month", "date")}{field(overtime, setOvertime, "gross", "Monthly gross", "number")}{field(overtime, setOvertime, "workingDays", "Working-day basis", "number", "Configured basis")}{field(overtime, setOvertime, "days", "Overtime days", "number")}{accountSelect(overtime, setOvertime)}{field(overtime, setOvertime, "accountNumber", "Employee account number")}{field(overtime, setOvertime, "notes", "Schedule note", "text", "UAT overtime calculation") }<p className="text-sm font-semibold text-primary">Calculated overtime: {formatCurrency(overtimeEarnings)}</p><Button onClick={saveOvertime} disabled={actionDisabled || !overtime.employee || Number(overtime.days) <= 0 || Number(overtime.workingDays) <= 0}>Submit for approval</Button></div></DialogContent></Dialog></div>
          <div className="grid gap-3 sm:grid-cols-2"><Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Submitted salary rows</p><p className="text-2xl font-bold">{salarySchedules.length}</p></CardContent></Card><Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Submitted overtime rows</p><p className="text-2xl font-bold">{overtimeEntries.length}</p></CardContent></Card></div>
          {salarySchedules.length === 0 && overtimeEntries.length === 0 ? <EmptyState compact icon={Banknote} title="No HR finance schedules yet" description="Submit a salary or overtime row to begin an auditable approval-to-payment workflow." /> : <div className="space-y-2">{salarySchedules.slice(0, 10).map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><div className="min-w-0"><p className="text-sm font-medium">{memberName(row.employee_id)}</p><p className="text-xs text-muted-foreground">Salary · {row.period_start} to {row.period_end}</p></div><div className="flex flex-wrap items-center justify-end gap-1"><Badge variant="outline" className="capitalize">{row.status}</Badge><span className="text-sm font-semibold text-primary">{formatCurrency(Number(row.net_pay))}</span>{canApprove && row.status === "submitted" && <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => approveSalary.mutate(row.id)}>Approve</Button>}{canApprove && row.status === "approved" && <Button size="sm" className="h-7 text-[10px]" onClick={() => paySalary.mutate(row.id)}>Create payment</Button>}{row.status === "paid" && <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => generatePayslip(row)}><FileDown className="mr-1 h-3 w-3" />Payslip</Button>}</div></div>)}</div>}
          <div className="space-y-2">{overtimeEntries.slice(0, 10).map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><div className="min-w-0"><p className="text-sm font-medium">{memberName(row.employee_id)}</p><p className="text-xs text-muted-foreground">Overtime · {row.period_month}</p></div><div className="flex flex-wrap items-center justify-end gap-1"><Badge variant="outline" className="capitalize">{row.status}</Badge><span className="text-sm font-semibold text-primary">{formatCurrency(Number(row.overtime_earnings))}</span>{canApprove && row.status === "submitted" && <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => approveOvertime.mutate(row.id)}>Approve</Button>}{canApprove && row.status === "approved" && <Button size="sm" className="h-7 text-[10px]" onClick={() => payOvertime.mutate(row.id)}>Create payment</Button>}</div></div>)}</div>
        </TabsContent>
        <TabsContent value="loans" className="space-y-4"><Dialog open={loanOpen} onOpenChange={setLoanOpen}><DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Staff loan</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Issue staff loan</DialogTitle></DialogHeader><div className="space-y-3">{memberSelect(loan, setLoan)}{accountSelect(loan, setLoan)}{field(loan, setLoan, "amount", "Amount issued", "number")}{field(loan, setLoan, "additional", "Additional loan", "number")}{field(loan, setLoan, "months", "Repayment period (months)", "number")}{field(loan, setLoan, "start", "Start date", "date")}{field(loan, setLoan, "notes", "Notes") }<p className="text-sm font-semibold text-primary">Monthly repayment: {formatCurrency(loanMonthly)}</p><Button onClick={saveLoan} disabled={actionDisabled || !loan.employee || Number(loan.amount) <= 0 || Number(loan.months) <= 0}>Record loan</Button></div></DialogContent></Dialog><Dialog open={repaymentOpen} onOpenChange={setRepaymentOpen}><DialogTrigger asChild><Button size="sm" variant="outline"><ReceiptText className="mr-1 h-4 w-4" />Repayment</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Record loan repayment</DialogTitle></DialogHeader><div className="space-y-3"><div className="space-y-1"><Label>Loan *</Label><Select value={repaymentLoanId} onValueChange={setRepaymentLoanId}><SelectTrigger><SelectValue placeholder="Select active loan" /></SelectTrigger><SelectContent>{loans.filter((row) => row.status === "active" && Number(row.outstanding_balance) > 0).map((row) => <SelectItem key={row.id} value={row.id}>{memberName(row.employee_id)} · {formatCurrency(Number(row.outstanding_balance))} outstanding</SelectItem>)}</SelectContent></Select></div>{field({ repaymentAmount }, (next) => setRepaymentAmount(next.repaymentAmount), "repaymentAmount", "Amount", "number")}{field({ repaymentDate }, (next) => setRepaymentDate(next.repaymentDate), "repaymentDate", "Date", "date")}{field({ repaymentNotes }, (next) => setRepaymentNotes(next.repaymentNotes), "repaymentNotes", "Notes")}<Button onClick={() => repayLoan.mutate()} disabled={repayLoan.isPending || !repaymentLoanId || Number(repaymentAmount) <= 0}>Record repayment</Button></div></DialogContent></Dialog>{loans.length === 0 ? <EmptyState compact icon={CreditCard} title="No staff loans" description="Issued loans, repayment schedules, payroll deductions, and outstanding balances will appear here." /> : <div className="space-y-2">{loans.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><div><p className="text-sm font-medium">{memberName(row.employee_id)}</p><p className="text-xs text-muted-foreground">Started {row.start_date} · {row.repayment_period_months} months</p></div><div className="flex flex-wrap items-end justify-end gap-1"><div className="text-right"><Badge variant="outline" className="capitalize">{row.status}</Badge><p className="text-sm font-semibold text-primary">Balance {formatCurrency(Number(row.outstanding_balance))}</p></div>{row.status === "active" && <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => { setRepaymentLoanId(row.id); setRepaymentOpen(true); }}>Repay</Button>}</div></div>)}</div>}</TabsContent>
        <TabsContent value="benefits" className="space-y-4"><Dialog open={hmoOpen} onOpenChange={setHmoOpen}><DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />HMO enrolment</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Manage HMO enrolment</DialogTitle></DialogHeader><div className="space-y-3">{memberSelect(hmo, setHmo)}{accountSelect(hmo, setHmo)}{field(hmo, setHmo, "start", "Coverage start", "date")}{field(hmo, setHmo, "end", "Coverage end", "date") }<div className="space-y-1"><Label>Classification</Label><Select value={hmo.classification} onValueChange={(value) => setHmo({ ...hmo, classification: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="individual">Individual</SelectItem><SelectItem value="family">Family</SelectItem></SelectContent></Select></div>{field(hmo, setHmo, "amount", "Amount", "number")}<Button onClick={saveHmo} disabled={actionDisabled || !hmo.employee || !hmo.start || !hmo.end}>Save HMO</Button></div></DialogContent></Dialog>{hmoEntries.length === 0 ? <EmptyState compact icon={HeartPulse} title="No HMO schedules" description="Create biannual or custom effective-period coverage records for employees and families." /> : <div className="space-y-2">{hmoEntries.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><div><p className="text-sm font-medium">{memberName(row.employee_id)}</p><p className="text-xs text-muted-foreground">{row.coverage_start} to {row.coverage_end} · {row.family_classification}</p></div><span className="text-sm font-semibold text-primary">{formatCurrency(Number(row.amount))}</span></div>)}</div>}</TabsContent>
                <TabsContent value="accounts" className="space-y-4"><div className="flex flex-wrap gap-2"><Dialog open={accountOpen} onOpenChange={setAccountOpen}><DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Money source</Button></DialogTrigger>
<DialogContent><DialogHeader><DialogTitle>Add configured money source</DialogTitle></DialogHeader><div className="space-y-3">{field(account, setAccount, "name", "Account name *", "text", "Access Bank")}{field(account, setAccount, "number", "Account number")}{field(account, setAccount, "currency", "Currency", "text", "NGN")}<div className="space-y-1"><Label>Account type</Label><Select value={account.type} onValueChange={(value) => setAccount({ ...account, type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bank">Bank</SelectItem><SelectItem value="domiciliary">Domiciliary</SelectItem><SelectItem value="director">Director account</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div><Button onClick={saveAccount} disabled={actionDisabled || !account.name.trim()}>Save account</Button></div></DialogContent></Dialog><Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogTrigger asChild><Button size="sm" variant="outline"><Settings2 className="h-4 w-4 mr-1" />Workflow settings</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>HR approval settings</DialogTitle></DialogHeader><div className="space-y-3"><div className="space-y-1"><Label>Configured MD approver</Label><Select value={mdApprover || "none"} onValueChange={(value) => setMdApprover(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="Select approver" /></SelectTrigger><SelectContent><SelectItem value="none">Not configured</SelectItem>{memberOptions.map((member) => <SelectItem key={member.value} value={member.value}>{member.label}</SelectItem>)}</SelectContent></Select><p className="text-[11px] text-muted-foreground">Leave and disciplinary final decisions remain blocked until an approver is configured.</p></div>{field({ workingDays }, (next) => setWorkingDays(next.workingDays), "workingDays", "Working-day basis per month", "number", "Management input")}<Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending || !orgId || !userId}>{saveSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save settings</Button></div></DialogContent></Dialog></div>
          {accounts.length === 0 ? <EmptyState compact icon={Landmark} title="No money sources configured" description="Add approved company accounts before recording salary, expense, bank, or procurement transactions." /> : <div className="grid gap-2 sm:grid-cols-2">{accounts.map((row) => <div key={row.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><p className="font-medium">{row.account_name}</p><Badge variant={row.is_active ? "default" : "secondary"}>{row.currency}</Badge></div><p className="text-xs text-muted-foreground capitalize">{row.account_type}{row.account_number ? ` · ${row.account_number}` : ""}</p></div>)}</div>}</TabsContent>
        <TabsContent value="vat" className="space-y-4"><Dialog open={vatOpen} onOpenChange={setVatOpen}><DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />VAT entry</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Add VAT schedule entry</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2">{field(vat, setVat, "date", "Date", "date")}{field(vat, setVat, "clientName", "Client name *")}{field(vat, setVat, "tin", "Client TIN")}{field(vat, setVat, "gross", "Gross amount", "number")}{field(vat, setVat, "outputVat", "Output VAT", "number")}{field(vat, setVat, "inputVat", "Input VAT", "number")}{field(vat, setVat, "withholding", "Withholding tax / 2% WHT", "number")}{field(vat, setVat, "vatWithheld", "VAT withheld", "number")}{field(vat, setVat, "vatPaid", "VAT paid", "number")}{field(vat, setVat, "penalty", "Penalty", "number")}{field(vat, setVat, "interest", "Interest", "number")}{field(vat, setVat, "broughtForward", "Brought forward", "number")}{field(vat, setVat, "lrp", "LRP", "number")}<div className="space-y-1"><Label>State</Label><Select value={vat.state} onValueChange={(value) => setVat({ ...vat, state: value })}><SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger><SelectContent>{NIGERIAN_STATES.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Local government</Label><Select value={vat.lga || "none"} onValueChange={(value) => setVat({ ...vat, lga: value === "none" ? "" : value })}><SelectTrigger><SelectValue placeholder={vat.state ? "Select LGA" : "Select state first"} /></SelectTrigger><SelectContent><SelectItem value="none">Not specified</SelectItem>{lgasForState(vat.state).map((lga) => <SelectItem key={lga} value={lga}>{lga}</SelectItem>)}</SelectContent></Select></div>{field(vat, setVat, "note", "Note")}<div className="space-y-1"><Label>Source record type</Label><Select value={vat.sourceType || "none"} onValueChange={(value) => setVat({ ...vat, sourceType: value === "none" ? "" : value })}><SelectTrigger><SelectValue placeholder="Optional source" /></SelectTrigger><SelectContent><SelectItem value="none">No source linked</SelectItem><SelectItem value="invoice">Invoice</SelectItem><SelectItem value="expense">Expense</SelectItem><SelectItem value="purchase_order">Purchase order</SelectItem><SelectItem value="receipt">Receipt</SelectItem><SelectItem value="worker_payment">Worker payment</SelectItem></SelectContent></Select></div>{field(vat, setVat, "sourceId", "Source record ID")}<div className="space-y-1"><Label>Free Trade Zone</Label><Select value={vat.freeTradeZone} onValueChange={(value) => setVat({ ...vat, freeTradeZone: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="false">No</SelectItem><SelectItem value="true">Yes</SelectItem></SelectContent></Select></div></div><p className="text-sm text-muted-foreground">Net amount: {formatCurrency(vatNet)} · VAT payable: {formatCurrency(vatSchedule.vatPayable)} · VAT credit: {formatCurrency(vatSchedule.vatCredit)} · Total: {formatCurrency(vatTotal)}</p><Button onClick={saveVat} disabled={actionDisabled || !vat.clientName.trim()}>Save VAT entry</Button></DialogContent></Dialog>{vatEntries.length === 0 ? <EmptyState compact icon={FileSpreadsheet} title="No VAT schedule entries" description="VAT entries remain linked to client, invoice, expense, or procurement evidence when a source is supplied." /> : <div className="space-y-2">{vatEntries.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><div><p className="text-sm font-medium">{row.client_name}</p><p className="text-xs text-muted-foreground">{row.entry_date} · {row.state ?? "State not set"}{row.local_government ? ` · ${row.local_government}` : ""}</p></div><span className="text-sm font-semibold text-primary">{formatCurrency(Number(row.total_vat_credit_payable))}</span></div>)}</div>}</TabsContent>
      </Tabs>
    </CardContent>
  </Card>;
}
