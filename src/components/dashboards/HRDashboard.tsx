import { Link } from "react-router-dom";
import { CalendarDays, Award, Clock, CreditCard, IdCard, Users, ArrowRight, BriefcaseBusiness } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGsapFadeUp, useGsapStagger } from "@/hooks/useGsapAnimation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HRConnectedOperationsView } from "@/components/hr/HRConnectedOperationsView";
import { HRFinanceCommandCenter } from "@/components/dashboards/HRFinanceCommandCenter";

type Member = { user_id: string; role: string };
type Profile = { full_name?: string | null; account_number?: string | null };

const HRDashboard = () => {
  const { user, profile, memberships, activeRole, isMaintenance } = useAuth();
  const headerRef = useGsapFadeUp();
  const cardsRef = useGsapStagger(".gsap-card", 0.08);
  const orgId = memberships[0]?.organization_id;
  const isHrOrAdmin = activeRole === "hr" || activeRole === "administrator" || isMaintenance;

  const { data: todayAttendance } = useQuery({
    queryKey: ["hr-attendance-today", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("organization_id", orgId)
        .eq("date", today);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: pendingLeaves } = useQuery({
    queryKey: ["hr-pending-leaves", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("organization_id", orgId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: aiInsights } = useQuery({
    queryKey: ["ai-summary", "hr", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("ai_summaries")
        .select("*")
        .eq("organization_id", orgId)
        .eq("context", "hr")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
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
      return new Map< string, Profile >(((data as Array<Profile & { user_id: string }>) ?? []).map((item) => [item.user_id, item]));
    },
    enabled: !!orgId && isHrOrAdmin,
  });

  const actionCards = [
    { title: "Review attendance", description: "Check today’s arrivals, missing check-outs, and attendance history.", href: "/hr?tab=attendance", icon: Clock },
    { title: "Review leave requests", description: "Approve, return, or follow up on staff leave requests.", href: "/hr?tab=leaves", icon: CalendarDays },
    { title: "Run payroll", description: "Preview statutory deductions and submit salary or overtime for approval.", href: "/hr?tab=payroll", icon: CreditCard },
    { title: "Manage people records", description: "Open ID cards, performance, recruitment, training, and skills records.", href: "/hr?tab=idcards", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div ref={headerRef} className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Your HR workspace</p>
          <h1 className="mt-1 text-xl font-bold sm:text-2xl">HR Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome, {profile?.full_name?.split(" ")[0] ?? "HR"}. Start with the live HR + Finance command center, then open the owning workspace when you need to act.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 font-medium text-foreground">Viewing as {activeRole === "hr" ? "HR" : "Administrator"}</span>
          <span>People records remain the source of truth in the HR workspace.</span>
        </div>
      </div>

      <HRFinanceCommandCenter orgId={orgId} activeRole={activeRole ?? undefined} />

      <div ref={cardsRef} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actionCards.map((action) => {
          const Icon = action.icon;
          return (
            <Card key={action.href} className="gsap-card border-border/60 transition-colors hover:border-primary/40">
              <CardContent className="flex h-full flex-col p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="font-semibold">{action.title}</p>
                <p className="mt-1 flex-1 text-xs leading-5 text-muted-foreground">{action.description}</p>
                <Button asChild variant="outline" size="sm" className="mt-4 w-full justify-between">
                  <Link to={action.href}>Open workspace <ArrowRight className="h-3.5 w-3.5" /></Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50"><CardContent className="p-4"><Clock className="mb-2 h-5 w-5 text-primary" /><p className="text-2xl font-bold">{todayAttendance?.length ?? 0}</p><p className="text-xs text-muted-foreground">Checked in today</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><CalendarDays className="mb-2 h-5 w-5 text-warning" /><p className="text-2xl font-bold">{pendingLeaves?.length ?? 0}</p><p className="text-xs text-muted-foreground">Leave requests awaiting review</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><IdCard className="mb-2 h-5 w-5 text-primary" /><p className="text-2xl font-bold">{members.length}</p><p className="text-xs text-muted-foreground">People in this workspace</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><BriefcaseBusiness className="mb-2 h-5 w-5 text-primary" /><p className="text-2xl font-bold">3</p><p className="text-xs text-muted-foreground">Connected work areas</p></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-5 w-5 text-warning" /> Pending leave requests</CardTitle><CardDescription>Items that may need an HR decision today.</CardDescription></CardHeader>
          <CardContent>
            {pendingLeaves && pendingLeaves.length > 0 ? (
              <div className="space-y-2">{pendingLeaves.slice(0, 5).map((leave) => <div key={leave.id} className="flex items-center justify-between gap-3 border-b border-border/50 py-2 last:border-0"><div className="min-w-0"><p className="truncate text-sm capitalize">{leave.leave_type} leave</p><p className="text-xs text-muted-foreground">{leave.start_date} → {leave.end_date}</p></div><span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">Pending</span></div>)}</div>
            ) : <p className="py-4 text-center text-sm text-muted-foreground">No pending leave requests.</p>}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Award className="h-5 w-5 text-primary" /> Workforce intelligence</CardTitle><CardDescription>Use this as context, not as a replacement for HR review.</CardDescription></CardHeader>
          <CardContent>{aiInsights ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{aiInsights.summary}</p> : <p className="py-4 text-center text-sm text-muted-foreground">AI detects attendance patterns, flags irregular check-in behavior, and generates workforce insights automatically.</p>}</CardContent>
        </Card>
      </div>

      {isHrOrAdmin && <HRConnectedOperationsView orgId={orgId} userId={user?.id} members={members} profileMap={profileMap} activeRole={activeRole ?? undefined} />}
    </div>
  );
};

export default HRDashboard;
