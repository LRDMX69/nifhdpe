import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/constants";
import { ArrowRight, FileText, Target, Users } from "lucide-react";
import { useGsapFadeUp } from "@/hooks/useGsapAnimation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type QuotationRow = Database["public"]["Tables"]["quotations"]["Row"] & { clients: { name: string } | null };

const SalesDashboard = () => {
  const { profile, memberships } = useAuth();
  const headerRef = useGsapFadeUp();
  const orgId = memberships[0]?.organization_id;

  const { data: recentQuotations } = useQuery({
    queryKey: ["sales-quotations", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("quotations").select("*, clients(name)").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(5);
      return (data ?? []) as QuotationRow[];
    },
    enabled: !!orgId,
  });

  const { data: clientCount = 0 } = useQuery({
    queryKey: ["sales-client-count", orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const { count } = await supabase.from("clients").select("id", { count: "exact", head: true }).eq("organization_id", orgId);
      return count ?? 0;
    },
    enabled: !!orgId,
  });

  const { data: opportunityCount = 0 } = useQuery({
    queryKey: ["sales-opportunity-count", orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const { count } = await supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("organization_id", orgId);
      return count ?? 0;
    },
    enabled: !!orgId,
  });

  const statusColors: Record<string, string> = { draft: "bg-muted text-muted-foreground", sent: "bg-primary/10 text-primary", accepted: "bg-primary/20 text-primary", rejected: "bg-destructive/10 text-destructive" };
  const summaryLinks = [
    { label: "Clients", value: clientCount, href: "/clients", icon: Users, detail: "Open contacts and sites" },
    { label: "Recent quotations", value: recentQuotations?.length ?? 0, href: "/quotations", icon: FileText, detail: "Review commercial work" },
    { label: "Opportunities", value: opportunityCount, href: "/opportunities", icon: Target, detail: "Qualify active leads" },
  ];

  return (
    <div className="space-y-5">
      <div ref={headerRef}><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Sales workspace</p><h1 className="mt-1 text-xl font-bold sm:text-2xl">Sales & Reception</h1><p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">Welcome, {profile?.full_name?.split(" ")[0] ?? "Sales"}. Move from a client opportunity to a clear quotation.</p></div>

      <Card className="border-primary/20 bg-primary/[0.02]"><CardHeader className="pb-3"><CardTitle className="text-base">Start with the sales pipeline</CardTitle><p className="text-sm text-muted-foreground">Choose the place where your next commercial action begins.</p></CardHeader><CardContent className="grid gap-2 sm:grid-cols-3">{summaryLinks.map((item) => { const Icon = item.icon; return <Link key={item.href} to={item.href} className="group flex min-w-0 items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus:outline-none focus:ring-2 focus:ring-primary/40"><span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-xl font-bold">{item.value}</span><span className="block truncate text-xs text-muted-foreground">{item.detail}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link>; })}</CardContent></Card>

      <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" /> Recent quotations</CardTitle><p className="text-sm text-muted-foreground">The latest quotation records from this organization.</p></CardHeader><CardContent>{recentQuotations && recentQuotations.length > 0 ? <div className="space-y-2">{recentQuotations.map((q) => <Link key={q.id} to="/quotations" className="flex items-center justify-between gap-3 rounded-lg border-b border-border/50 py-2 transition-colors hover:bg-primary/[0.03] last:border-0"><div className="min-w-0"><p className="text-sm font-medium">{q.quotation_number}</p><p className="truncate text-xs text-muted-foreground">{q.clients?.name ?? "No client"}</p></div><div className="flex shrink-0 items-center gap-2"><span className="text-sm font-medium">{formatCurrency(Number(q.total_amount ?? 0))}</span><span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[q.status] ?? ""}`}>{q.status}</span></div></Link>)}</div> : <p className="py-4 text-sm text-muted-foreground">No quotations yet. Open Quotations to prepare the first one.</p>}</CardContent></Card>
    </div>
  );
};

export default SalesDashboard;
