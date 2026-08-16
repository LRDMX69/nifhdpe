import { useQuery } from "@tanstack/react-query";
import { FileText, GraduationCap, MessageSquare, Users, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { humanizeError } from "@/lib/humanizeError";

const KnowledgeManagerDashboard = () => {
  const { memberships } = useAuth();
  const navigate = useNavigate();
  const orgId = memberships[0]?.organization_id;

  const { data: knowledgeCount = 0, isLoading: knowledgeLoading, error: knowledgeError } = useQuery({
    queryKey: ["knowledge-manager-article-count", orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const { count, error } = await supabase
        .from("knowledge_articles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!orgId,
  });

  const { data: trainingCount = 0, isLoading: trainingLoading, error: trainingError } = useQuery({
    queryKey: ["knowledge-manager-training-count", orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const { count, error } = await supabase
        .from("training_logs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!orgId,
  });

  const { data: recentArticles = [], isLoading: articlesLoading, error: articlesError } = useQuery({
    queryKey: ["knowledge-manager-recent-articles", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("knowledge_articles")
        .select("id, title, category, updated_at")
        .eq("organization_id", orgId)
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const sourceError = knowledgeError || trainingError || articlesError;
  const loading = knowledgeLoading || trainingLoading || articlesLoading;

  return (
    <div className="p-3 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Knowledge workspace</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">Institutional Knowledge</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Keep SOPs, technical references, training records, and issued documents easy for the whole team to find.
        </p>
      </div>

      {sourceError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Could not load the knowledge workspace: {humanizeError(sourceError)}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><FileText className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Knowledge articles</p><p className="text-2xl font-semibold">{loading ? "…" : knowledgeCount}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><GraduationCap className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Training records</p><p className="text-2xl font-semibold">{loading ? "…" : trainingCount}</p></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle className="text-base">Knowledge operations</CardTitle><p className="text-sm text-muted-foreground mt-1">Use the existing connected workspaces; no duplicate records are created here.</p></div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/documents")}><FileText className="h-4 w-4 mr-1" />Registry</Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/hr")}><Users className="h-4 w-4 mr-1" />Training</Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/messages")}><MessageSquare className="h-4 w-4 mr-1" />Messages</Button>
          </div>
        </CardHeader>
        <CardContent>
          {articlesLoading ? <p className="text-sm text-muted-foreground">Loading recent articles…</p> : recentArticles.length === 0 ? <p className="text-sm text-muted-foreground">No knowledge articles have been published yet.</p> : (
            <div className="space-y-2">
              {recentArticles.map((article) => (
                <div key={article.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0"><p className="font-medium truncate">{article.title}</p><div className="flex items-center gap-2 mt-1"><Badge variant="secondary" className="text-[10px]">{article.category}</Badge><span className="text-xs text-muted-foreground">Updated {new Date(article.updated_at).toLocaleDateString()}</span></div></div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeManagerDashboard;
