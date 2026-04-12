import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, BookOpen, Wrench, Shield, AlertCircle, CheckSquare, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useGsapAnimation } from "@/hooks/useGsapAnimation";
import { AiInsightPanel } from "@/components/AiInsightPanel";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type KnowledgeArticle = Database["public"]["Tables"]["knowledge_articles"]["Row"];

const CATEGORIES = [
  { id: "fusion", label: "Fusion Procedures", icon: Wrench },
  { id: "installation", label: "Installation", icon: CheckSquare },
  { id: "safety", label: "Safety", icon: Shield },
  { id: "troubleshooting", label: "Troubleshooting", icon: AlertCircle },
  { id: "tools", label: "Tools & Equipment", icon: Wrench },
  { id: "training", label: "Training Modules", icon: BookOpen },
];

const KnowledgeBase = () => {
  const { user, memberships, activeRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = memberships[0]?.organization_id;
  const canEdit = activeRole === "administrator" || activeRole === "knowledge_manager";

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("fusion");
  const [content, setContent] = useState("");
  const [pipeSizes, setPipeSizes] = useState("");

  const containerRef = useGsapAnimation("slideUp");

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["knowledge-articles", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("knowledge_articles")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const saveMutation = useMutation({
    mutationFn: async (isEdit: boolean) => {
      if (!orgId || !user) throw new Error("Not authenticated");
      const payload = {
        organization_id: orgId,
        title: title.trim(),
        category,
        content: content.trim(),
        pipe_sizes: pipeSizes.trim() || null,
        created_by: user.id,
      };
      if (isEdit && editingArticle) {
        const { error } = await supabase.from("knowledge_articles").update(payload).eq("id", editingArticle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("knowledge_articles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingArticle ? "Article updated" : "Article created" });
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
      resetForm();
      setDialogOpen(false);
    },
    onError: (err: unknown) => {
      const error = err as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("knowledge_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Article deleted" });
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      const error = err as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setTitle(""); setCategory("fusion"); setContent(""); setPipeSizes("");
    setEditingArticle(null);
  };

  const openEdit = (article: KnowledgeArticle) => {
    setEditingArticle(article);
    setTitle(article.title);
    setCategory(article.category);
    setContent(article.content || "");
    setPipeSizes(article.pipe_sizes || "");
    setDialogOpen(true);
  };

  const filtered = articles.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    (a.content ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const categoryCounts = CATEGORIES.map(c => ({
    ...c,
    count: articles.filter(a => a.category === c.id).length,
  }));

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div ref={containerRef} className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Knowledge Base" description="SOPs, procedures, and technical reference library">
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Article</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editingArticle ? "Edit Article" : "New Article"}</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(!!editingArticle); }}>
                <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Article title" required /></div>
                <div className="space-y-2"><Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Content *</Label><Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Article content..." rows={6} required /></div>
                <div className="space-y-2"><Label>Pipe Sizes (comma-separated)</Label><Input value={pipeSizes} onChange={e => setPipeSizes(e.target.value)} placeholder="110mm, 160mm, 200mm" /></div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}{editingArticle ? "Update" : "Create"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <AiInsightPanel context="knowledge" title="Technical AI Assistant" suggestions={["Butt fusion parameters for 160mm SDR11", "Pressure test procedure steps", "Troubleshoot failed electrofusion joint", "Safety checklist for site work"]} />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categoryCounts.map(c => (
          <Card key={c.id}><CardContent className="p-4 flex items-center gap-3">
            <c.icon className="h-6 w-6 text-primary opacity-70" />
            <div><p className="font-medium text-xs">{c.label}</p><p className="text-xs text-muted-foreground">{c.count}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <div className="w-full overflow-x-auto pb-1 scrollbar-hide">
          <TabsList className="flex w-max min-w-full justify-start bg-transparent p-0 gap-1 h-auto">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">All</TabsTrigger>
            {CATEGORIES.map(c => <TabsTrigger key={c.id} value={c.id} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap">{c.label}</TabsTrigger>)}
          </TabsList>
        </div>
        {["all", ...CATEGORIES.map(c => c.id)].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {filtered.filter(a => tab === "all" || a.category === tab).map(a => (
              <Card key={a.id} className="hover:border-primary/30 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" />{a.title}</span>
                    {canEdit && (
                      <span className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{a.content}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">{CATEGORIES.find(c => c.id === a.category)?.label ?? a.category}</Badge>
                    {a.pipe_sizes?.split(",").map((p: string) => p.trim()).filter(Boolean).map((p: string) => (
                      <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.filter(a => tab === "all" || a.category === tab).length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No articles found.</CardContent></Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default KnowledgeBase;
