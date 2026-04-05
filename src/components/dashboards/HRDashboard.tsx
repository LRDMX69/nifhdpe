import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Users, CalendarDays, Award, Clock } from "lucide-react";
import { useGsapFadeUp, useGsapStagger } from "@/hooks/useGsapAnimation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const HRDashboard = () => {
  const { profile, memberships } = useAuth();
  const headerRef = useGsapFadeUp();
  const cardsRef = useGsapStagger(".gsap-card", 0.08);
  const orgId = memberships[0]?.organization_id;

  const { data: todayAttendance } = useQuery({
    queryKey: ["hr-attendance-today", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("organization_id", orgId)
        .eq("date", today);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: pendingLeaves } = useQuery({
    queryKey: ["hr-pending-leaves", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("organization_id", orgId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: aiInsights } = useQuery({
    queryKey: ["ai-summary", "hr", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase
        .from("ai_summaries")
        .select("*")
        .eq("organization_id", orgId)
        .eq("context", "hr")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!orgId,
  });

  return (
    <div className="space-y-6">
      <div ref={headerRef}>
        <h1 className="text-xl sm:text-2xl font-bold">HR Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Welcome, {profile?.full_name?.split(" ")[0] ?? "HR"} — attendance and workforce insights.
        </p>
      </div>

      <div ref={cardsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="gsap-card border-border/50">
          <CardContent className="pt-4 pb-4">
            <Clock className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{todayAttendance?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Checked In Today</p>
          </CardContent>
        </Card>
        <Card className="gsap-card border-border/50">
          <CardContent className="pt-4 pb-4">
            <CalendarDays className="h-5 w-5 text-warning mb-2" />
            <p className="text-2xl font-bold">{pendingLeaves?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Pending Leaves</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-warning" />
              Pending Leave Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingLeaves && pendingLeaves.length > 0 ? (
              <div className="space-y-2">
                {pendingLeaves.slice(0, 5).map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm capitalize">{l.leave_type} leave</p>
                      <p className="text-xs text-muted-foreground">{l.start_date} → {l.end_date}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">Pending</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No pending leave requests.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              AI Workforce Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiInsights ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiInsights.summary}</p>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                AI detects attendance patterns, flags irregular check-in behavior, and generates productivity insights automatically.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HRDashboard;
