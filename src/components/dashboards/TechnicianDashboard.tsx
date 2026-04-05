import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { FolderKanban, ClipboardList, Package, Wrench, Clock, Plus } from "lucide-react";
import { useGsapFadeUp, useGsapStagger } from "@/hooks/useGsapAnimation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

const TechnicianDashboard = () => {
  const { profile, user, memberships } = useAuth();
  const headerRef = useGsapFadeUp();
  const cardsRef = useGsapStagger(".gsap-card", 0.08);
  const navigate = useNavigate();
  const orgId = memberships[0]?.organization_id;

  // Fetch assigned projects
  const { data: projects, isLoading } = useQuery({
    queryKey: ["technician-projects", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("organization_id", orgId)
        .in("status", ["in_progress", "planning"])
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const getDeadlineDays = (endDate: string | null) => {
    if (!endDate) return null;
    const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6">
      <div ref={headerRef}>
        <h1 className="text-xl sm:text-2xl font-bold">
          My Assignments
        </h1>
        <p className="text-muted-foreground text-sm">
          Welcome, {profile?.full_name?.split(" ")[0] ?? "Technician"} — here are your active tasks.
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => navigate("/field-reports")} className="gap-2">
          <Plus className="h-4 w-4" />
          Submit Report
        </Button>
      </div>

      <div ref={cardsRef} className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="gsap-card border-border/50">
              <CardContent className="pt-4 pb-4">
                <Skeleton className="h-5 w-1/2 mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))
        ) : projects && projects.length > 0 ? (
          projects.map((project) => {
            const daysLeft = getDeadlineDays(project.end_date);
            return (
              <Card key={project.id} className="gsap-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate("/projects")}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{project.description ?? "No description"}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs flex items-center gap-1 text-muted-foreground">
                          <Package className="h-3 w-3" />
                          Progress: {project.progress_percent ?? 0}%
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          project.status === "in_progress" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {project.status?.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    {daysLeft !== null && (
                      <div className={`flex items-center gap-1 text-xs shrink-0 ${daysLeft <= 3 ? "text-destructive" : daysLeft <= 7 ? "text-warning" : "text-muted-foreground"}`}>
                        <Clock className="h-3 w-3" />
                        {daysLeft > 0 ? `${daysLeft}d left` : "Overdue"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="border-border/50">
            <CardContent className="py-8 text-center">
              <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active assignments.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TechnicianDashboard;
