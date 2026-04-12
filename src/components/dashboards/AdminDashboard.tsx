import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/constants";
import {
  AlertTriangle, TrendingUp,
  FileText, Target, Clock, CheckCircle2, XCircle, Zap, Bot,
  Printer, DollarSign, Wrench, Mail, Loader2, RefreshCw,
} from "lucide-react";
import { useGsapStagger, useGsapFadeUp } from "@/hooks/useGsapAnimation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { CheckInWidget } from "@/components/CheckInWidget";
import { IntelligenceFeed } from "@/components/dashboards/IntelligenceFeed";
import { PrintRequestsInbox } from "@/components/print/PrintRequestDialog";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const { profile, memberships, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const headerRef = useGsapFadeUp();
  const statsRef = useGsapStagger(".gsap-card", 0.08);
  const orgId = memberships[0]?.organization_id;
  const printRef = useRef<HTMLDivElement>(null);

  // Auto-Mode from DB
  const { data: autoModeData } = useQuery({
    queryKey: ["auto-mode", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase.from("auto_mode_settings").select("*").eq("organization_id", orgId).maybeSingle();
      return data;
    },
    enabled: !!orgId,
  });

  const autoMode = autoModeData?.enabled ?? false;

  const toggleAutoMode = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!orgId || !user) return;
      const { data: existing } = await supabase.from("auto_mode_settings").select("id").eq("organization_id", orgId).maybeSingle();
      if (existing) {
        await supabase.from("auto_mode_settings").update({ enabled, updated_by: user.id, updated_at: new Date().toISOString() }).eq("id", existing.id);
      } else {
        await supabase.from("auto_mode_settings").insert({ organization_id: orgId, enabled, updated_by: user.id });
      }
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["auto-mode"] });
      if (enabled) {
        toast({ title: "Auto-Mode activated", description: "AI will now run department scans automatically." });
        // Trigger immediate run
        runAllDepartments.mutate();
      } else {
        toast({ title: "Auto-Mode deactivated" });
      }
    },
  });

  // Run all department automations
  const runAllDepartments = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No org");
      const departments = ["finance", "hr", "warehouse", "engineering"];
      
      // Run central monitor first
      await supabase.functions.invoke("central-ai-monitor", { body: { organization_id: orgId } });
      
      // Run all departments in parallel
      await Promise.allSettled(
        departments.map(dept =>
          supabase.functions.invoke("department-automation", { body: { organization_id: orgId, department: dept } })
        )
      );
    },
    onSuccess: () => {
      toast({ title: "All department scans complete", description: "Intelligence feed updated with latest insights." });
      queryClient.invalidateQueries({ queryKey: ["intelligence-logs"] });
      queryClient.invalidateQueries({ queryKey: ["ai-summary"] });
    },
    onError: (err: unknown) => {
      const error = err as Error;
      toast({ title: "Scan failed", description: error.message, variant: "destructive" });
    },
  });

  const { data: aiSummary = [], isLoading: aiLoading } = useQuery({
    queryKey: ["ai-summary", "admin_daily", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("ai_summaries")
        .select("*")
        .eq("organization_id", orgId)
        .in("context", ["central_ai", "admin_daily", "finance", "hr", "warehouse", "engineering", "field_report", "opportunities", "anomaly_detection", "stock_analysis"])
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: recentReports = [] } = useQuery({
    queryKey: ["admin-reports", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("field_reports").select("*, structured_reports(*), projects(name)").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(8);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: pendingClaims = [] } = useQuery({
    queryKey: ["admin-claims", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("worker_claims").select("*").eq("organization_id", orgId).eq("status", "pending").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: pendingEquipReqs = [] } = useQuery({
    queryKey: ["admin-equip-reqs", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("equipment_requests").select("*, equipment(name)").eq("organization_id", orgId).eq("status", "pending").order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: financeSummary } = useQuery({
    queryKey: ["admin-finance-summary", orgId],
    queryFn: async () => {
      if (!orgId) return { expenses: 0, payments: 0 };
      const { data: expenses } = await supabase.from("expenses").select("amount").eq("organization_id", orgId);
      const { data: payments } = await supabase.from("worker_payments").select("amount").eq("organization_id", orgId);
      return {
        expenses: (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0),
        payments: (payments ?? []).reduce((s, p) => s + Number(p.amount), 0),
      };
    },
    enabled: !!orgId,
  });

  const { data: oppCount = 0 } = useQuery({
    queryKey: ["opp-count", orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const { count } = await supabase.from("opportunities").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "identified");
      return count ?? 0;
    },
    enabled: !!orgId,
  });

  const { data: unreadMsgCount = 0 } = useQuery({
    queryKey: ["unread-msg-count", orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user) return 0;
      const { count } = await supabase.from("messages").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("is_read", false).or(`recipient_id.eq.${user.id},message_type.eq.broadcast`);
      return count ?? 0;
    },
    enabled: !!orgId && !!user,
  });

  const updateClaim = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("worker_claims").update({ status, reviewed_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-claims"] }),
  });

  const updateEquipReq = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("equipment_requests").update({ status, reviewed_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-equip-reqs"] }),
  });

  const formatContent = (content: string) =>
    content.replace(/#{1,6}\s/g, "").replace(/\*\*\*(.*?)\*\*\*/g, "$1").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/`(.*?)`/g, "$1").replace(/---/g, "").trim();

  const contextLabels: Record<string, string> = {
    central_ai: "🛡️ Central AI",
    finance: "💰 Finance",
    hr: "👥 HR",
    warehouse: "📦 Warehouse",
    engineering: "🔧 Engineering",
    field_report: "📋 Field Report",
    opportunities: "🎯 Opportunities",
    admin_daily: "📊 Daily Summary",
    anomaly_detection: "⚠️ Anomaly",
    stock_analysis: "📈 Stock",
  };

  const stats = [
    { label: "Opportunities", value: oppCount, icon: Target, onClick: () => navigate("/opportunities") },
    { label: "Pending Claims", value: pendingClaims.length, icon: AlertTriangle, onClick: () => navigate("/claims") },
    { label: "Equipment Reqs", value: pendingEquipReqs.length, icon: Wrench, onClick: () => navigate("/equipment") },
    { label: "Unread Messages", value: unreadMsgCount, icon: Mail, onClick: () => navigate("/messages") },
    { label: "Total Expenses", value: formatCurrency(financeSummary?.expenses ?? 0), icon: DollarSign, onClick: () => navigate("/finance") },
  ];

  return (
    <div className="space-y-6">
      <div ref={headerRef} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">Control Tower</h1>
          <p className="text-muted-foreground text-sm">Executive Intelligence for {profile?.full_name?.split(" ")[0] ?? "Admin"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            <Bot className="h-4 w-4 text-primary shrink-0" />
            <Label htmlFor="auto-mode" className="text-xs sm:text-sm cursor-pointer whitespace-nowrap">Auto-Mode</Label>
            <Switch id="auto-mode" checked={autoMode} onCheckedChange={(v) => toggleAutoMode.mutate(v)} />
          </div>
          <Button variant="outline" size="sm" onClick={() => runAllDepartments.mutate()} disabled={runAllDepartments.isPending}>
            {runAllDepartments.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            <span className="hidden sm:inline">Run All Scans</span>
          </Button>
          <Button variant="outline" size="sm" className="print-hide" onClick={async () => {
            const { generatePdf } = await import("@/lib/generatePdf");
            generatePdf({ title: "Admin Dashboard Summary", content: `Dashboard summary generated on ${new Date().toLocaleDateString()}\n\nThis is an overview of the current system state.`, showSignature: false });
          }}>
            <Printer className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Print</span>
          </Button>
        </div>
      </div>

      <CheckInWidget />

      {autoMode && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 text-sm space-y-1">
            <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary shrink-0" /><span className="font-medium">AI Auto-Mode Active</span></div>
            <p className="text-muted-foreground text-xs break-words-safe">AI runs central monitoring, finance analysis, HR tracking, warehouse optimization, and engineering oversight automatically every 30 minutes. Financial actions are flagged for review — no autonomous spending.</p>
          </CardContent>
        </Card>
      )}

      <div ref={statsRef} className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="gsap-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer shadow-sm" onClick={stat.onClick}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate font-medium">{stat.label}</p>
                  <p className="text-lg sm:text-xl font-bold mt-1 truncate text-foreground">{stat.value}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0"><stat.icon className="h-4 w-4" /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div ref={printRef} className="print-container">
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">NIF Technical — Executive Daily Digest</h1>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          <Separator className="my-4" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> AI Department Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
              {aiLoading ? (
                <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
              ) : aiSummary.length > 0 ? (
                (aiSummary as any[]).map((s) => (
                  <div key={s.id} className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
                    <Badge variant="outline" className="text-[10px]">{contextLabels[s.context] ?? s.context.replace(/_/g, " ")}</Badge>
                    <p className="leading-relaxed text-xs sm:text-sm break-words-safe">{formatContent(s.summary.substring(0, 400))}{s.summary.length > 400 ? "..." : ""}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No AI insights yet. Click "Run All Scans" or enable Auto-Mode.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" /> Action Required ({pendingClaims.length + pendingEquipReqs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
              {(pendingEquipReqs as any[]).map((r) => (
                <div key={r.id} className="bg-muted/30 rounded-lg p-3 text-xs space-y-2">
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-medium truncate">🔧 {r.equipment?.name}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">Equipment</Badge>
                  </div>
                  {r.reason && <p className="text-muted-foreground break-words-safe">{r.reason}</p>}
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-6 text-[10px] text-primary" onClick={() => updateEquipReq.mutate({ id: r.id, status: "approved" })}>
                      <CheckCircle2 className="h-3 w-3 mr-0.5" />Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] text-destructive" onClick={() => updateEquipReq.mutate({ id: r.id, status: "denied" })}>
                      <XCircle className="h-3 w-3 mr-0.5" />Deny
                    </Button>
                  </div>
                </div>
              ))}
              {pendingClaims.length === 0 && pendingEquipReqs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending items.</p>
              ) : (
                (pendingClaims as any[]).slice(0, 5).map((c) => (
                  <div key={c.id} className="bg-muted/30 rounded-lg p-3 text-xs space-y-2">
                    <div className="flex justify-between items-start gap-1">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{c.category}</p>
                        <p className="text-muted-foreground break-words-safe">{c.description?.substring(0, 80)}</p>
                      </div>
                      {c.amount > 0 && <span className="font-bold shrink-0 text-sm">{formatCurrency(c.amount)}</span>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-6 text-[10px] text-primary" onClick={() => updateClaim.mutate({ id: c.id, status: "approved" })}>
                        <CheckCircle2 className="h-3 w-3 mr-0.5" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] text-destructive" onClick={() => updateClaim.mutate({ id: c.id, status: "rejected" })}>
                        <XCircle className="h-3 w-3 mr-0.5" />Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50 mt-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Field Reports
              </CardTitle>
              <Button variant="ghost" size="sm" className="print-hide" onClick={() => navigate("/field-reports")}>View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports submitted yet.</p>
            ) : (
              <div className="space-y-2">
                {(recentReports as any[]).map((r) => {
                  const hasStructured = r.structured_reports && r.structured_reports.length > 0;
                  const routedTo = r.notes?.startsWith("routed_to:") ? r.notes.replace("routed_to:", "") : null;
                  return (
                    <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/30 rounded-lg gap-2">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{r.projects?.name ?? "General Report"}</p>
                        <p className="text-xs text-muted-foreground">{r.report_date} · {r.crew_members || "No crew listed"}</p>
                        {hasStructured && (
                          <p className="text-xs text-foreground break-words-safe">
                            {formatContent(r.structured_reports[0].structured_content.substring(0, 150))}...
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 flex-wrap">
                        {routedTo && <Badge variant="outline" className="text-[10px] capitalize">→ {routedTo}</Badge>}
                        {hasStructured ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]" variant="outline">Processed</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]"><Clock className="h-3 w-3 mr-1" />Raw</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <IntelligenceFeed />

      {/* Print Requests */}
      <Card className="border-border/50">
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

export default AdminDashboard;
