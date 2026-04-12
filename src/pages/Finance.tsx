import { useState, useMemo } from "react";
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
import { Plus, DollarSign, TrendingUp, TrendingDown, Brain, CreditCard, Loader2, MoreVertical, Pencil, Trash2, FileDown } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { useGsapAnimation } from "@/hooks/useGsapAnimation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { stripMarkdown } from "@/lib/stripMarkdown";

const PAYMENT_TYPES = ["salary", "overtime", "fuel", "maintenance", "bonus", "transport", "vendor"] as const;
const EXPENSE_CATEGORIES = ["labor", "fuel", "transport", "materials", "equipment", "other"] as const;

const Finance = () => {
  const { user, memberships } = useAuth();
  const { toast } = useToast();
  const orgId = memberships[0]?.organization_id;
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "expense" | "payment" } | null>(null);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const containerRef = useGsapAnimation("slideUp");

  // Payment form
  const [payType, setPayType] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDesc, setPayDesc] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payUserId, setPayUserId] = useState("");

  // Expense form
  const [expCategory, setExpCategory] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);

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

  const { data: payments = [], refetch: refetchPayments } = useQuery({
    queryKey: ["worker-payments", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("worker_payments").select("*").eq("organization_id", orgId).order("date", { ascending: false }).limit(100);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: expenses = [], refetch: refetchExpenses } = useQuery({
    queryKey: ["expenses", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("expenses").select("*").eq("organization_id", orgId).order("date", { ascending: false }).limit(100);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: acceptedQuotations = [] } = useQuery({
    queryKey: ["accepted-quotations-finance", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("quotations").select("total_amount, created_at").eq("organization_id", orgId).eq("status", "accepted");
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: financeInsights } = useQuery({
    queryKey: ["ai-insights-finance"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_summaries").select("*").eq("context", "finance").order("created_at", { ascending: false }).limit(1);
      return data?.[0] ?? null;
    },
  });

  const financials = useMemo(() => {
    const totalRevenue = acceptedQuotations.reduce((s: number, q: any) => s + Number(q.total_amount ?? 0), 0);
    const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
    const totalPayments = payments.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
    const netProfit = totalRevenue - totalExpenses - totalPayments;

    const monthlyMap = new Map<string, { revenue: number; expenses: number }>();
    acceptedQuotations.forEach((q: any) => {
      const month = new Date(q.created_at).toLocaleString("en", { month: "short" });
      const entry = monthlyMap.get(month) ?? { revenue: 0, expenses: 0 };
      entry.revenue += Number(q.total_amount ?? 0);
      monthlyMap.set(month, entry);
    });
    expenses.forEach((e: any) => {
      const month = new Date(e.date).toLocaleString("en", { month: "short" });
      const entry = monthlyMap.get(month) ?? { revenue: 0, expenses: 0 };
      entry.expenses += Number(e.amount ?? 0);
      monthlyMap.set(month, entry);
    });
    const chartData = Array.from(monthlyMap.entries()).map(([month, data]) => ({ month, ...data })).slice(-6);

    return { totalRevenue, totalExpenses: totalExpenses + totalPayments, netProfit, totalPayments, chartData };
  }, [payments, expenses, acceptedQuotations]);

  const getMemberName = (userId: string) => members.find(m => m.value === userId)?.label ?? "Unknown";

  const resetPaymentForm = () => { setPayType(""); setPayAmount(""); setPayDesc(""); setPayUserId(""); setPayDate(new Date().toISOString().split("T")[0]); setEditingPayment(null); };
  const resetExpenseForm = () => { setExpCategory(""); setExpAmount(""); setExpDesc(""); setExpDate(new Date().toISOString().split("T")[0]); setEditingExpense(null); };

  const openEditPayment = (p: any) => {
    setEditingPayment(p); setPayType(p.type); setPayAmount(p.amount.toString());
    setPayDesc(p.description ?? ""); setPayDate(p.date); setPayUserId(p.user_id ?? "");
    setPaymentOpen(true);
  };

  const openEditExpense = (e: any) => {
    setEditingExpense(e); setExpCategory(e.category); setExpAmount(e.amount.toString());
    setExpDesc(e.description ?? ""); setExpDate(e.date);
    setExpenseOpen(true);
  };

  const handleLogPayment = async () => {
    if (!payType || !payAmount || !user || !orgId) return;
    setSaving(true);
    try {
      const payload: any = {
        type: payType as any, amount: parseFloat(payAmount),
        description: payDesc || null, date: payDate, user_id: payUserId || null,
      };
      if (editingPayment) {
        const { error } = await supabase.from("worker_payments").update(payload).eq("id", editingPayment.id);
        if (error) throw error;
        toast({ title: "Payment updated" });
      } else {
        const { error } = await supabase.from("worker_payments").insert({ ...payload, organization_id: orgId, created_by: user.id });
        if (error) throw error;
        toast({ title: "Payment logged" });
        supabase.functions.invoke("anomaly-detection", { body: { organization_id: orgId } }).catch(console.error);
      }
      setPaymentOpen(false); resetPaymentForm(); refetchPayments();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleLogExpense = async () => {
    if (!expCategory || !expAmount || !user || !orgId) return;
    setSaving(true);
    try {
      const payload: any = {
        category: expCategory as any, amount: parseFloat(expAmount),
        description: expDesc || null, date: expDate,
      };
      if (editingExpense) {
        const { error } = await supabase.from("expenses").update(payload).eq("id", editingExpense.id);
        if (error) throw error;
        toast({ title: "Expense updated" });
      } else {
        const { error } = await supabase.from("expenses").insert({ ...payload, organization_id: orgId, created_by: user.id });
        if (error) throw error;
        toast({ title: "Expense logged" });
      }
      setExpenseOpen(false); resetExpenseForm(); refetchExpenses();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const table = deleteTarget.type === "expense" ? "expenses" : "worker_payments";
      const { error } = await supabase.from(table).delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: `${deleteTarget.type === "expense" ? "Expense" : "Payment"} deleted` });
      setDeleteTarget(null);
      if (deleteTarget.type === "expense") refetchExpenses(); else refetchPayments();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleExportReport = async () => {
    const { generatePdf } = await import("@/lib/generatePdf");
    generatePdf({
      title: "Financial Report",
      senderDepartment: "Finance",
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
        rows: expenses.slice(0, 50).map((e: any) => ({
          date: e.date, category: e.category,
          description: e.description || "—",
          amount: Number(e.amount).toLocaleString(),
        })),
        summary: [
          { label: "Total Expenses", value: formatCurrency(expenses.reduce((s: number, e: any) => s + Number(e.amount), 0)) },
        ],
      } : undefined,
      stampType: "finance",
      showSignature: true,
    });
  };

  return (
    <div ref={containerRef} className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Finance" description="Revenue, expenses, payments, and profit tracking">
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportReport}><FileDown className="h-4 w-4 mr-1" />Export PDF</Button>
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
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} /></div>
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
                <div className="space-y-2"><Label>Amount (₦) *</Label><Input type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="0.00" /></div>
                <Button className="w-full" onClick={handleLogExpense} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}{editingExpense ? "Update" : "Save"} Expense</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

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
          { label: "Total Costs", value: formatCurrency(financials.totalExpenses), icon: TrendingDown, color: "text-red-400" },
          { label: "Net Profit", value: formatCurrency(financials.netProfit), icon: TrendingUp, color: "text-emerald-400" },
          { label: "Payments (Total)", value: formatCurrency(financials.totalPayments), icon: CreditCard, color: "text-blue-400" },
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto bg-transparent p-0 gap-1 h-auto scrollbar-hide">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="expenses" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Expenses</TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card><CardHeader><CardTitle className="text-base">Revenue vs Expenses</CardTitle></CardHeader>
            <CardContent>
              {financials.chartData.length === 0 ? (
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
        </TabsContent>

        <TabsContent value="expenses">
          <Card><CardHeader><CardTitle className="text-base">Logged Expenses</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {expenses.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">No expenses logged yet.</p>
              ) : (
                <div className="min-w-[600px]">
                  <Table><TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="w-[40px]"></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {expenses.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{e.date}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{e.category}</Badge></TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" title={e.description || ""}>{e.description || "—"}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card><CardHeader><CardTitle className="text-base">Worker Payments</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {payments.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">No payments logged yet.</p>
              ) : (
                <div className="min-w-[700px]">
                  <Table><TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="w-[40px]"></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {payments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{p.date}</TableCell>
                        <TableCell className="text-sm">{p.user_id ? getMemberName(p.user_id) : "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{p.type}</Badge></TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" title={p.description || ""}>{p.description || "—"}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Finance;
