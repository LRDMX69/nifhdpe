import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/constants";
import { Users, FileText, Target, Bell, Printer } from "lucide-react";
import { PrintRequestsInbox } from "@/components/print/PrintRequestDialog";
import { useGsapFadeUp, useGsapStagger } from "@/hooks/useGsapAnimation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const SalesDashboard = () => {
  const { profile, memberships } = useAuth();
  const headerRef = useGsapFadeUp();
  const cardsRef = useGsapStagger(".gsap-card", 0.08);
  const navigate = useNavigate();
  const orgId = memberships[0]?.organization_id;

  const { data: recentQuotations } = useQuery({
    queryKey: ["sales-quotations", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("quotations")
        .select("*, clients(name)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: clientCount } = useQuery({
    queryKey: ["sales-client-count", orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const { count } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);
      return count ?? 0;
    },
    enabled: !!orgId,
  });

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    sent: "bg-primary/10 text-primary",
    accepted: "bg-primary/20 text-primary",
    rejected: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-6">
      <div ref={headerRef}>
        <h1 className="text-xl sm:text-2xl font-bold">Sales & Reception</h1>
        <p className="text-muted-foreground text-sm">
          Welcome, {profile?.full_name?.split(" ")[0] ?? "Sales"} — clients, quotations, and opportunities.
        </p>
      </div>

      <div ref={cardsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="gsap-card border-border/50 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/clients")}>
          <CardContent className="pt-4 pb-4">
            <Users className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{clientCount}</p>
            <p className="text-xs text-muted-foreground">Total Clients</p>
          </CardContent>
        </Card>
        <Card className="gsap-card border-border/50 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/quotations")}>
          <CardContent className="pt-4 pb-4">
            <FileText className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{recentQuotations?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Recent Quotes</p>
          </CardContent>
        </Card>
        <Card className="gsap-card border-border/50 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/opportunities")}>
          <CardContent className="pt-4 pb-4">
            <Target className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground">Opportunities</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Recent Quotations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentQuotations && recentQuotations.length > 0 ? (
            <div className="space-y-2">
              {recentQuotations.map((q: any) => (
                <div key={q.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{q.quotation_number}</p>
                    <p className="text-xs text-muted-foreground truncate">{q.clients?.name ?? "No client"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium">{formatCurrency(Number(q.total_amount ?? 0))}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[q.status] ?? ""}`}>
                      {q.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No quotations yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Print Requests Inbox */}
      <Card className="gsap-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" /> Print Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PrintRequestsInbox />
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesDashboard;
