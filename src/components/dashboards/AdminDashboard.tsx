import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/constants";
import { StatCard } from "./StatCard";
import { 
  TrendingUp, TrendingDown, DollarSign, AlertCircle, AlertTriangle,
  Briefcase, Users, ShieldAlert, ArrowUpRight, 
  Calendar, CheckCircle2, Clock, Loader2, Zap, Target, Wrench, Mail, RefreshCw, Printer, Bot, FileText, XCircle
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
import { useExecutiveFinancials } from "@/hooks/useExecutiveFinancials";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid
} from "recharts";

const AdminDashboard = () => {
  const { profile, memberships, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const headerRef = useGsapFadeUp();
  const statsRef = useGsapStagger(".gsap-card", 0.08);
  const orgId = memberships[0]?.organization_id;
  const printRef = useRef<HTMLDivElement>(null);

  // --- CEO Data ---
  const { data: financeData, isLoading: financeLoading } = useExecutiveFinancials(orgId);

  const { data: projectHealth } = useQuery({
    queryKey: ["ceo-project-health", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("projects").select("id, name, status, budget, start_date").eq("organization_id", orgId);
      return data || [];
    },
    enabled: !!orgId
  });

  const { data: alerts } = useQuery({
    queryKey: ["ceo-alerts", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const [compliance, safety, maintenance] = await Promise.all([
        supabase.from("compliance_documents").select("*").eq("organization_id", orgId).not("expiry_date", "is", null),
        supabase.from("hse_incidents").select("*").eq("organization_id", orgId).eq("status", "open"),
        supabase.rpc("get_maintenance_alerts", { _org_id: orgId })
      ]);
      const today = new Date();
      const expiringSoon = (compliance.data || []).filter(doc => {
        const expiry = new Date(doc.expiry_date);
        const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));
        return diff <= 30;
      }).map(doc => ({ type: 'compliance', title: doc.name, date: doc.expiry_date, severity: 'high' }));
      const openIncidents = (safety.data || []).map(inc => ({
        type: 'safety',
        title: inc.type + ': ' + inc.location,
        date: inc.incident_date,
        severity: inc.severity
      }));
      const maintenanceAlerts = (maintenance.data || []).map((m: any) => ({
        type: 'maintenance',
        title: `${m.alert_type}: ${m.equipment_name}`,
        date: m.due_date,
        severity: m.days_overdue > 0 ? 'critical' : 'warning'
      }));
      return [...expiringSoon, ...openIncidents, ...maintenanceAlerts];
    },
    enabled: !!orgId
  });

  // --- Admin Data ---
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
        runAllDepartments.mutate();
      } else {
        toast({ title: "Auto-Mode deactivated" });
      }
    },
  });

  const runAllDepartments = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No org");
      const departments = ["finance", "hr", "warehouse", "engineering"];
      await supabase.functions.invoke("central-ai-monitor", { body: { organization_id: orgId } });
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
    { label: "Net Cash", value: formatCurrency(financeData?.netCash || 0), icon: DollarSign, onClick: () => navigate("/finance"), color: "text-emerald-500" },
    { label: "Active Projects", value: projectHealth?.filter(p => p.status === 'in_progress').length || 0, icon: Briefcase, onClick: () => navigate("/projects"), color: "text-primary" },
    { label: "Opportunities", value: oppCount, icon: Target, onClick: () => navigate("/opportunities"), color: "text-primary" },
    { label: "Pending Claims", value: pendingClaims.length, icon: AlertCircle, onClick: () => navigate("/claims"), color: "text-warning" },
    { label: "Equipment Reqs", value: pendingEquipReqs.length, icon: Wrench, onClick: () => navigate("/equipment"), color: "text-blue-500" },
    { label: "Unread Messages", value: unreadMsgCount, icon: Mail, onClick: () => navigate("/messages"), color: "text-emerald-500" },
    { label: "Total Expenses", value: formatCurrency(financeSummary?.expenses ?? 0), icon: DollarSign, onClick: () => navigate("/finance"), color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div ref={headerRef} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">Executive Command Center</h1>
          <p className="text-muted-foreground text-sm">Strategic oversight for {profile?.full_name?.split(" ")[0] ?? "Admin"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            <Bot className="h-4 w-4 text-primary shrink-0" />
            <Label htmlFor="auto-mode" className="text-xs sm:text-sm cursor-pointer whitespace-nowrap">Auto-Mode</Label>
            <Switch id="auto-mode" checked={autoMode} onCheckedChange={(v) => toggleAutoMode.mutate(v)} />
          </div>
          <Button variant="outline" size="sm" onClick={() => runAllDepartments.mutate()} disabled={runAllDepartments.isPending}>
            {runAllDepartments.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            <span className="hidden sm:inline">Run Scans</span>
          </Button>
          <Button variant="outline" size="sm" className="print-hide" onClick={async () => {
            const { generatePdf } = await import("@/lib/generatePdf");
            generatePdf({ title: "Executive Dashboard Summary", content: `Dashboard summary generated on ${new Date().toLocaleDateString()}\n\nThis is an overview of the current system state.`, showSignature: false });
          }}>
            <Printer className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Export</span>
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

      <div ref={statsRef} className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            onClick={stat.onClick}
          />
        ))}
      </div>

      <div ref={printRef} className="print-container">
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">NIF Technical — Executive Daily Digest</h1>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          <Separator className="my-4" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Financial Performance (6 Months)</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {financeLoading ? (
                <div className="flex h-[300px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : (
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financeData?.chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} tick={{fill: 'hsl(var(--muted-foreground))'}} />
                      <YAxis axisLine={false} tickLine={false} fontSize={12} tick={{fill: 'hsl(var(--muted-foreground))'}} tickFormatter={(v) => `₦${(v/1000000).toFixed(1)}M`} />
                      <Tooltip 
                        cursor={{fill: 'hsl(var(--muted)/0.5)'}}
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                        formatter={(v: number) => [formatCurrency(v), '']}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={32} />
                      <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} barSize={32} opacity={0.6} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-destructive" /> Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[300px] overflow-y-auto">
              {alerts && alerts.length > 0 ? (
                alerts.map((a, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${a.severity === 'critical' ? 'bg-destructive animate-pulse' : 'bg-warning'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase text-muted-foreground">{a.type}</p>
                      <p className="text-sm font-medium leading-tight mt-0.5">{a.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {a.date}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-20" />
                  <p className="text-sm text-muted-foreground">All systems clear. No critical alerts.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> AI Department Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
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
                <p className="text-sm text-muted-foreground">No AI insights yet. Click "Run Scans" or enable Auto-Mode.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" /> Action Required ({pendingClaims.length + pendingEquipReqs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Project Portfolio Health</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>Details <ArrowUpRight className="ml-1 h-3 w-3" /></Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {projectHealth?.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">Budget: {formatCurrency(p.budget || 0)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge variant="outline" className="text-[10px] capitalize">{(p.status || 'planning').replace('_', ' ')}</Badge>
                      </div>
                      <div className="h-8 w-1 rounded-full bg-emerald-500" title="On Track" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
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
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {(recentReports as any[]).map((r) => {
                    const hasStructured = r.structured_reports && r.structured_reports.length > 0;
                    const routedTo = r.notes?.startsWith("routed_to:") ? r.notes.replace("routed_to:", "") : null;
                    return (
                      <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/30 rounded-lg gap-2">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{r.projects?.name ?? "General Report"}</p>
                          <p className="text-xs text-muted-foreground">{r.report_date} · {r.crew_members || "No crew listed"}</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" /> Strategic Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-background/50 rounded-xl border border-primary/10">
                  <p className="text-sm leading-relaxed italic text-foreground">
                    "Financial liquidity is healthy at ₦{(financeData?.netCash || 0).toLocaleString()}. However, receivables aging shows ₦{(financeData?.receivables || 0).toLocaleString()} outstanding beyond 60 days. Recommend prioritizing collection."
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none text-[10px]">CFO ADVISORY</Badge>
                    <span className="text-[10px] text-muted-foreground">Generated recently</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <IntelligenceFeed />
          </div>

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
      </div>
    </div>
  );
};

export default AdminDashboard;
