import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { TrendingUp, DollarSign, Percent, Package, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useGsapStagger } from "@/hooks/useGsapAnimation";
import { formatCurrency } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

const COLORS = ["hsl(105,73%,49%)", "hsl(207,80%,40%)", "hsl(38,92%,50%)", "hsl(0,72%,51%)", "hsl(210,10%,60%)"];

const Analytics = () => {
  const { memberships } = useAuth();
  const orgId = memberships[0]?.organization_id;
  const statsRef = useGsapStagger(".gsap-card", 0.08);

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["analytics-payments", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("worker_payments").select("amount, date, type").eq("organization_id", orgId).order("date", { ascending: false }).limit(500);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ["analytics-expenses", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("expenses").select("amount, date, category").eq("organization_id", orgId).order("date", { ascending: false }).limit(500);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: quotations = [] } = useQuery({
    queryKey: ["analytics-quotations", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("quotations").select("total_amount, status, created_at, client_id, clients(name)").eq("organization_id", orgId).limit(500);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["analytics-inventory", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("inventory").select("item_name, diameter_mm, quantity_meters, unit_cost, item_type").eq("organization_id", orgId);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const analytics = useMemo(() => {
    const totalRevenue = (quotations as any[]).filter((q) => q.status === "accepted").reduce((s: number, q) => s + Number(q.total_amount ?? 0), 0);
    const totalExpenses = (expenses as any[]).reduce((s: number, e) => s + Number(e.amount ?? 0), 0);
    const totalPayments = (payments as any[]).reduce((s: number, p) => s + Number(p.amount ?? 0), 0);
    const netProfit = totalRevenue - totalExpenses - totalPayments;

    const sentCount = (quotations as any[]).filter((q) => ["sent", "accepted", "rejected"].includes(q.status)).length;
    const acceptedCount = (quotations as any[]).filter((q) => q.status === "accepted").length;
    const conversionRate = sentCount > 0 ? Math.round((acceptedCount / sentCount) * 100) : 0;

    const inventoryValue = (inventory as any[]).reduce((s: number, i) => s + (i.quantity_meters ?? 0) * (i.unit_cost ?? 0), 0);

    // Monthly revenue data
    const monthlyMap = new Map<string, { revenue: number; expenses: number }>();
    (quotations as any[]).filter((q) => q.status === "accepted").forEach((q) => {
      const month = new Date(q.created_at).toLocaleString("en", { month: "short" });
      const entry = monthlyMap.get(month) ?? { revenue: 0, expenses: 0 };
      entry.revenue += Number(q.total_amount ?? 0);
      monthlyMap.set(month, entry);
    });
    (expenses as any[]).forEach((e) => {
      const month = new Date(e.date).toLocaleString("en", { month: "short" });
      const entry = monthlyMap.get(month) ?? { revenue: 0, expenses: 0 };
      entry.expenses += Number(e.amount ?? 0);
      monthlyMap.set(month, entry);
    });
    const revenueData = Array.from(monthlyMap.entries()).map(([month, data]) => ({ month, ...data })).slice(-6);

    // Pipe usage by diameter
    const diameterMap = new Map<string, number>();
    (inventory as any[]).forEach((i) => {
      const key = i.diameter_mm ? `${i.diameter_mm}mm` : "Other";
      diameterMap.set(key, (diameterMap.get(key) ?? 0) + Number(i.quantity_meters ?? 0));
    });
    const pipeUsageData = Array.from(diameterMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

    // Quotation conversion by month
    const convMap = new Map<string, { sent: number; accepted: number }>();
    (quotations as any[]).forEach((q) => {
      const month = new Date(q.created_at).toLocaleString("en", { month: "short" });
      const entry = convMap.get(month) ?? { sent: 0, accepted: 0 };
      if (["sent", "accepted", "rejected"].includes(q.status)) entry.sent++;
      if (q.status === "accepted") entry.accepted++;
      convMap.set(month, entry);
    });
    const conversionData = Array.from(convMap.entries()).map(([month, data]) => ({ month, ...data })).slice(-6);

    // Top clients
    const clientMap = new Map<string, number>();
    (quotations as any[]).filter((q) => q.status === "accepted").forEach((q) => {
      const name = q.clients?.name ?? "Unknown";
      clientMap.set(name, (clientMap.get(name) ?? 0) + Number(q.total_amount ?? 0));
    });
    const topClients = Array.from(clientMap.entries()).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return { totalRevenue, totalExpenses: totalExpenses + totalPayments, netProfit, conversionRate, sentCount, acceptedCount, inventoryValue, revenueData, pipeUsageData, conversionData, topClients };
  }, [payments, expenses, quotations, inventory]);

  const isLoading = loadingPayments || loadingExpenses;

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const summaryStats = [
    { label: "Total Revenue", value: formatCurrency(analytics.totalRevenue), icon: DollarSign, sub: `${analytics.acceptedCount} accepted quotations` },
    { label: "Conversion Rate", value: `${analytics.conversionRate}%`, icon: Percent, sub: `${analytics.acceptedCount} of ${analytics.sentCount} quotations` },
    { label: "Net Profit", value: formatCurrency(analytics.netProfit), icon: TrendingUp, sub: `After ₦${(analytics.totalExpenses / 1000000).toFixed(1)}M expenses` },
    { label: "Inventory Value", value: formatCurrency(analytics.inventoryValue), icon: Package, sub: `${inventory.length} items in stock` },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader title="Analytics" description="Live business insights from your data" />

      <div ref={statsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryStats.map((s) => (
          <Card key={s.label} className="gsap-card border-border/50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl sm:text-2xl font-bold mt-1">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{s.sub}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary"><s.icon className="h-4 w-4" /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Revenue vs Expenses</CardTitle></CardHeader>
          <CardContent>
            {analytics.revenueData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No financial data yet. Accept quotations and log expenses to see trends.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,10%,87%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₦${(v / 1000000).toFixed(0)}M`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="revenue" fill="hsl(105,73%,49%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="hsl(0,72%,51%)" radius={[4, 4, 0, 0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Inventory by Pipe Size</CardTitle></CardHeader>
          <CardContent>
            {analytics.pipeUsageData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No inventory data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={analytics.pipeUsageData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {analytics.pipeUsageData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Quotation Conversion</CardTitle></CardHeader>
          <CardContent>
            {analytics.conversionData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No quotation data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={analytics.conversionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,10%,87%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sent" stroke="hsl(210,10%,60%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="accepted" stroke="hsl(105,73%,49%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Clients by Revenue</CardTitle></CardHeader>
          <CardContent>
            {analytics.topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No accepted quotations yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.topClients} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,10%,87%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `₦${(v / 1000000).toFixed(0)}M`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="revenue" fill="hsl(207,80%,40%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
