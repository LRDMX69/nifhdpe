import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, GraduationCap, MessageSquare, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { humanizeError } from "@/lib/humanizeError";

const ACTIONS = [
  { title: "Open document registry", description: "Find, review, and reprint approved documents.", href: "/documents", icon: FileText },
  { title: "Review HR learning", description: "Open training and people context shared with HR.", href: "/hr", icon: Users },
  { title: "Open messages", description: "Respond to requests and clarify operational knowledge.", href: "/messages", icon: MessageSquare },
];

const KnowledgeManagerDashboard = () => {
  const { memberships } = useAuth();
  const orgId = memberships[0]?.organization_id;

  const { data: knowledgeCount = 0, isLoading: knowledgeLoading, error: knowledgeError } = useQuery({
    queryKey: ["knowledge-manager-article-count", orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const { count, error } = await supabase.from("knowledge_articles").select("id", { count: "exact", head: true }).eq("organization_id", orgId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!orgId,
  });

  const { data: trainingCount = 0, isLoading: trainingLoading, error: trainingError } = useQuery({
    queryKey: ["knowledge-manager-training-count", orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const { count, error } = await supabase.from("training_logs").select("id", { count: "exact", head: true }).eq("organization_id", orgId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!orgId,
  });

  const { data: recentArticles = [], isLoading: articlesLoading, error: articlesError } = useQuery({
    queryKey: ["knowledge-manager-recent-articles", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from("knowledge_articles").select("id, title, category, updated_at").eq("organization_id", orgId).order("updated_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const sourceError = knowledgeError || trainingError || articlesError;
  const loading = knowledgeLoading || trainingLoading || articlesLoading;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Knowledge workspace</p>
        <h1 className="mt-1 text-xl font-bold sm:text-2xl">Institutional Knowledge</h1>
        <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">Keep SOPs, technical references, training records, and issued documents easy for the whole team to find.</p>
      </div>

      {sourceError && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">Could not load the knowledge workspace: {humanizeError(sourceError)}</div>}

      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardHeader className="pb-3"><CardTitle className="text-base">Start with a knowledge task</CardTitle><p className="text-sm text-muted-foreground">Choose where you need to work. These links open the existing source workspace.</p></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          {ACTIONS.map((action) => { const Icon = action.icon; return <Link key={action.href} to={action.href} className="group flex min-w-0 items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus:outline-none focus:ring-2 focus:ring-primary/40"><span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{action.title}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{action.description}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></Link>; })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Knowledge at a glance</CardTitle><p className="text-sm text-muted-foreground">Live counts from the knowledge and training records.</p></CardHeader>
        <CardContent className="grid grid-cols-2 divide-x divide-border/60">
          <Link to="/documents" className="p-3 pl-0 transition-colors hover:bg-primary/[0.03]"><FileText className="h-4 w-4 text-primary" /><p className="mt-2 text-xl font-bold">{loading ? "…" : knowledgeCount}</p><p className="text-xs text-muted-foreground">Knowledge articles</p></Link>
          <Link to="/hr" className="p-3 transition-colors hover:bg-primary/[0.03]"><GraduationCap className="h-4 w-4 text-primary" /><p className="mt-2 text-xl font-bold">{loading ? "…" : trainingCount}</p><p className="text-xs text-muted-foreground">Training records</p></Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Recently updated knowledge</CardTitle><p className="text-sm text-muted-foreground">Review the latest published articles after opening the Registry when you need to act.</p></CardHeader>
        <CardContent>
          {articlesLoading ? <p className="text-sm text-muted-foreground">Loading recent articles…</p> : recentArticles.length === 0 ? <p className="text-sm text-muted-foreground">No knowledge articles have been published yet.</p> : <div className="space-y-2">{recentArticles.map((article) => <Link key={article.id} to="/documents" className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40"><div className="min-w-0"><p className="truncate font-medium">{article.title}</p><div className="mt-1 flex items-center gap-2"><Badge variant="secondary" className="text-[10px]">{article.category}</Badge><span className="text-xs text-muted-foreground">Updated {new Date(article.updated_at).toLocaleDateString()}</span></div></div><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link>)}</div>}
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeManagerDashboard;
