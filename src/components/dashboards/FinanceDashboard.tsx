import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/constants";
import { DollarSign, TrendingUp, AlertTriangle, CreditCard } from "lucide-react";
import { useGsapFadeUp, useGsapStagger } from "@/hooks/useGsapAnimation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const FinanceDashboard = () => {
  const { profile, memberships } = useAuth();
  const headerRef = useGsapFadeUp();
  const cardsRef = useGsapStagger(".gsap-card", 0.08);
  const orgId = memberships[0]?.organization_id;

  const { data: expenses } = useQuery({
    queryKey: ["finance-expenses", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("expenses")
        .select("*")
        .eq("organization_id", orgId)
        .order("date", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: payments } = useQuery({
    queryKey: ["finance-payments", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("worker_payments")
        .select("*")
        .eq("organization_id", orgId)
        .order("date", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: aiInsights } = useQuery({
    queryKey: ["ai-summary", "finance", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase
        .from("ai_summaries")
        .select("*")
        .eq("organization_id", orgId)
        .eq("context", "finance")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!orgId,
  });

  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  const totalPayments = payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div ref={headerRef}>
        <h1 className="text-xl sm:text-2xl font-bold">Financial Overview</h1>
        <p className="text-muted-foreground text-sm">
          Welcome, {profile?.full_name?.split(" ")[0] ?? "Finance"} — budget tracking and AI analysis.
        </p>
      </div>

      <div ref={cardsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="gsap-card border-border/50">
          <CardContent className="pt-4 pb-4">
            <DollarSign className="h-5 w-5 text-primary mb-2" />
            <p className="text-lg font-bold">{formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-muted-foreground">Recent Expenses</p>
          </CardContent>
        </Card>
        <Card className="gsap-card border-border/50">
          <CardContent className="pt-4 pb-4">
            <CreditCard className="h-5 w-5 text-primary mb-2" />
            <p className="text-lg font-bold">{formatCurrency(totalPayments)}</p>
            <p className="text-xs text-muted-foreground">Recent Payments</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Expenses */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenses && expenses.length > 0 ? (
              <div className="space-y-2">
                {expenses.slice(0, 8).map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{e.description ?? e.category}</p>
                      <p className="text-xs text-muted-foreground capitalize">{e.category} · {e.date}</p>
                    </div>
                    <span className="text-sm font-medium shrink-0">{formatCurrency(Number(e.amount))}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No expenses recorded yet.</p>
            )}
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              AI Financial Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiInsights ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiInsights.summary}</p>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                AI automatically detects profit leaks, forecasts cash flow, and flags cost anomalies.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinanceDashboard;
