import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, PenTool, Users } from "lucide-react";
import { useGsapFadeUp } from "@/hooks/useGsapAnimation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckInWidget } from "@/components/CheckInWidget";

const KnowledgeManagerDashboard = () => {
  const { profile, memberships } = useAuth();
  const headerRef = useGsapFadeUp();
  const navigate = useNavigate();
  const orgId = memberships[0]?.organization_id;

  const { data: articleCount = 0 } = useQuery({
    queryKey: ["kb-count", orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const { count } = await supabase
        .from("knowledge_articles")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);
      return count ?? 0;
    },
    enabled: !!orgId,
  });

  return (
    <div className="space-y-6">
      <div ref={headerRef} className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Knowledge Manager</h1>
          <p className="text-muted-foreground text-sm">
            Welcome, {profile?.full_name?.split(" ")[0] ?? "KM"} — manage articles and documentation.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/knowledge-base")}>
          <PenTool className="h-4 w-4 mr-1" /> Manage Articles
        </Button>
      </div>

      <CheckInWidget />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border/50 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/knowledge-base")}>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{articleCount}</p>
              <p className="text-xs text-muted-foreground">Total Articles</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KnowledgeManagerDashboard;
