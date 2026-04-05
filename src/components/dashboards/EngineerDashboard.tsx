import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { FolderKanban, ShieldCheck, FileText, AlertTriangle } from "lucide-react";
import { useGsapFadeUp, useGsapStagger } from "@/hooks/useGsapAnimation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const EngineerDashboard = () => {
  const { profile, memberships } = useAuth();
  const headerRef = useGsapFadeUp();
  const cardsRef = useGsapStagger(".gsap-card", 0.08);
  const orgId = memberships[0]?.organization_id;

  const { data: projects, isLoading } = useQuery({
    queryKey: ["engineer-projects", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("organization_id", orgId)
        .in("status", ["in_progress", "planning"])
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: aiInsights } = useQuery({
    queryKey: ["ai-summary", "engineering", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase
        .from("ai_summaries")
        .select("*")
        .eq("organization_id", orgId)
        .eq("context", "engineering")
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
        <h1 className="text-xl sm:text-2xl font-bold">Engineering Overview</h1>
        <p className="text-muted-foreground text-sm">
          Welcome, {profile?.full_name?.split(" ")[0] ?? "Engineer"} — technical specs and validation status.
        </p>
      </div>

      <div ref={cardsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Projects */}
        <Card className="gsap-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="space-y-2">
                {projects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.status?.replace("_", " ")}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{p.progress_percent ?? 0}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active projects.</p>
            )}
          </CardContent>
        </Card>

        {/* AI Validation Alerts */}
        <Card className="gsap-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              AI Technical Validation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiInsights ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiInsights.summary}</p>
            ) : (
              <div className="text-center py-6">
                <AlertTriangle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No validation alerts. AI monitors pipe compatibility, pressure tolerances, and installation standards automatically.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EngineerDashboard;
