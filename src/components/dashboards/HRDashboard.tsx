import { Link } from "react-router-dom";
import { Award, ArrowRight, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronDown, Clock, CreditCard, IdCard, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useGsapFadeUp } from "@/hooks/useGsapAnimation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HRConnectedOperationsView } from "@/components/hr/HRConnectedOperationsView";
import { HRFinanceCommandCenter } from "@/components/dashboards/HRFinanceCommandCenter";

type Member = { user_id: string; role: string };
type Profile = { full_name?: string | null; account_number?: string | null };

const HRDashboard = () => {
  const { user, profile, memberships, activeRole, isMaintenance } = useAuth();
  const headerRef = useGsapFadeUp();
  const orgId = memberships[0]?.organization_id;
  const isHrOrAdmin = activeRole === "hr" || activeRole === "administrator" || isMaintenance;

  const { data: todayAttendance } = useQuery({
    queryKey: ["hr-attendance-today", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.from("attendance").select("*").eq("organization_id", orgId).eq("date", today);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: pendingLeaves } = useQuery({
    queryKey: ["hr-pending-leaves", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from("leave_requests").select("*").eq("organization_id", orgId).eq("status", "pending").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: aiInsights } = useQuery({
    queryKey: ["ai-summary", "hr", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase.from("ai_summaries").select("*").eq("organization_id", orgId).eq("context", "hr").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-list-hr", orgId],
    queryFn: async () => {
      if (!orgId) return [] as Member[];
      const { data, error } = await supabase.from("organization_memberships").select("user_id, role").eq("organization_id", orgId);
      if (error) throw error;
      return (data ?? []) as Member[];
    },
    enabled: !!orgId && isHrOrAdmin,
  });

  const { data: profileMap = new Map<string, Profile>() } = useQuery({
    queryKey: ["profiles-for-hr", orgId],
    queryFn: async () => {
      if (!orgId) return new Map<string, Profile>();
      const { data, error } = await (supabase as any).rpc("get_org_payroll_profiles", { _org_id: orgId });
      if (error) throw error;
      return new Map<string, Profile>(((data as Array<Profile & { user_id: string }>) ?? []).map((item) => [item.user_id, item]));
    },
    enabled: !!orgId && isHrOrAdmin,
  });

  const actionCards = [
    { title: "Review attendance", description: "Today’s arrivals and attendance history", href: "/hr?tab=attendance", icon: Clock },
    { title: "Review leave requests", description: "Approve, return, or follow up", href: "/hr?tab=leaves", icon: CalendarDays },
    { title: "Run payroll", description: "Prepare salary and overtime", href: "/hr?tab=payroll", icon: CreditCard },
    { title: "Manage people records", description: "ID cards, recruitment, training, and skills", href: "/hr?tab=idcards", icon: Users },
  ];

  return (
    <div className="space-y-5">
      <div ref={headerRef} className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Your HR workspace</p>
          <h1 className="mt-1 text-xl font-bold sm:text-2xl">HR Dashboard</h1>
          <p className="max-w-3xl text-sm leading-5 text-muted-foreground">Welcome, {profile?.full_name?.split(" ")[0] ?? "HR"}. This page gives you the people picture first, then the connected finance context you may need to act.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 font-medium text-foreground">Viewing as {activeRole === "hr" ? "HR" : "Administrator"}</span>
          <span>Use the sections below in order: attention, summary, daily work, then detail.</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Start your HR work</CardTitle><CardDescription>Choose the task you came to complete. The labels use everyday HR language.</CardDescription></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {actionCards.map((action) => { const Icon = action.icon; return <Link key={action.href} to={action.href} className="group flex min-w-0 items-center gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus:outline-none focus:ring-2 focus:ring-primary/40"><span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{action.title}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{action.description}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></Link>; })}
        </CardContent>
      </Card>

      <HRFinanceCommandCenter orgId={orgId} activeRole={activeRole ?? undefined} />

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">People pulse</CardTitle><CardDescription>A small workforce snapshot. Open the related HR tab for detail.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-2 divide-x divide-y divide-border/60 sm:grid-cols-3 sm:divide-y-0">
          <Link to="/hr?tab=attendance" className="p-3 first:pl-0 hover:bg-primary/[0.03]"><Clock className="h-4 w-4 text-primary" /><p className="mt-2 text-xl font-bold">{todayAttendance?.length ?? 0}</p><p className="text-xs text-muted-foreground">Checked in today</p></Link>
          <Link to="/hr?tab=leaves" className="p-3 hover:bg-primary/[0.03]"><CalendarDays className="h-4 w-4 text-warning" /><p className="mt-2 text-xl font-bold">{pendingLeaves?.length ?? 0}</p><p className="text-xs text-muted-foreground">Leave to review</p></Link>
          <Link to="/hr?tab=idcards" className="p-3 hover:bg-primary/[0.03]"><IdCard className="h-4 w-4 text-primary" /><p className="mt-2 text-xl font-bold">{members.length}</p><p className="text-xs text-muted-foreground">People in workspace</p></Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-warning" /> Leave requests</CardTitle><CardDescription>Only requests waiting for an HR decision appear here.</CardDescription></CardHeader><CardContent>{pendingLeaves && pendingLeaves.length > 0 ? <div className="space-y-2">{pendingLeaves.slice(0, 5).map((leave) => <div key={leave.id} className="flex items-center justify-between gap-3 border-b border-border/50 py-2 last:border-0"><div className="min-w-0"><p className="truncate text-sm capitalize">{leave.leave_type} leave</p><p className="text-xs text-muted-foreground">{leave.start_date} → {leave.end_date}</p></div><span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">Pending</span></div>)}</div> : <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />No leave requests are waiting.</div>}</CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Award className="h-4 w-4 text-primary" /> Workforce notes</CardTitle><CardDescription>Context for HR review, not an automatic decision.</CardDescription></CardHeader><CardContent>{aiInsights ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{aiInsights.summary}</p> : <p className="py-3 text-sm text-muted-foreground">Workforce insights will appear here when the system has enough attendance and HR activity to interpret.</p>}</CardContent></Card>
      </div>

      <Collapsible defaultOpen={false} className="space-y-3">
        <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary"><BriefcaseBusiness className="h-4 w-4" /></span><div><p className="text-sm font-semibold">Detailed connected workspaces</p><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Open this only when you need the full payroll, commercial, delivery, bank, or reconciliation workspace. The summary above remains your starting point.</p></div></div><CollapsibleTrigger asChild><Button variant="outline" size="sm" className="shrink-0">Open connected workspaces<ChevronDown className="ml-1 h-3.5 w-3.5" /></Button></CollapsibleTrigger></div>
        <CollapsibleContent><HRConnectedOperationsView orgId={orgId} userId={user?.id} members={members} profileMap={profileMap} activeRole={activeRole ?? undefined} /></CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default HRDashboard;
