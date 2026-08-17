import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, BookOpen, Calculator, FileText, Loader2, PenLine } from "lucide-react";
import { useGsapFadeUp } from "@/hooks/useGsapAnimation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS } from "@/lib/constants";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { humanizeError } from "@/lib/humanizeError";

type ReflectionRow = Database["public"]["Tables"]["learning_reflections"]["Row"];

const TraineeDashboard = () => {
  const { user, profile, activeRole, memberships } = useAuth();
  const headerRef = useGsapFadeUp();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = memberships[0]?.organization_id;

  const [reflOpen, setReflOpen] = useState(false);
  const [reflTitle, setReflTitle] = useState("");
  const [reflText, setReflText] = useState("");
  const [reflWeek, setReflWeek] = useState("");

  const { data: reflections = [] } = useQuery({
    queryKey: ["learning-reflections", orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user) return [];
      const { data } = await supabase.from("learning_reflections").select("*").eq("organization_id", orgId).eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      return (data ?? []) as ReflectionRow[];
    },
    enabled: !!orgId && !!user,
  });

  const submitReflection = useMutation({
    mutationFn: async () => {
      if (!orgId || !user) throw new Error("Not authenticated");
      if (!reflTitle.trim() || !reflText.trim()) throw new Error("Title and reflection are required");
      const { error } = await supabase.from("learning_reflections").insert({ organization_id: orgId, user_id: user.id, title: reflTitle.trim(), reflection: reflText.trim(), week_number: reflWeek ? parseInt(reflWeek) : null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Reflection submitted" });
      setReflOpen(false);
      setReflTitle("");
      setReflText("");
      setReflWeek("");
      queryClient.invalidateQueries({ queryKey: ["learning-reflections"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: humanizeError(err), variant: "destructive" }),
  });

  const roleLabel = ROLE_LABELS[activeRole ?? ""] ?? "Trainee";

  return (
    <Dialog open={reflOpen} onOpenChange={setReflOpen}>
      <div className="space-y-5">
        <div ref={headerRef}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Learning workspace</p>
          <h1 className="mt-1 text-xl font-bold sm:text-2xl">{roleLabel} Dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">Welcome, {profile?.full_name?.split(" ")[0] ?? "Trainee"}. Follow your learning path, then record what you learned.</p>
        </div>

        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-3"><CardTitle className="text-base">Start your learning path</CardTitle><p className="text-sm text-muted-foreground">Choose one action. Your reflection history stays below for review.</p></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3">
            <DialogTrigger asChild><button type="button" className="group flex min-w-0 items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus:outline-none focus:ring-2 focus:ring-primary/40"><span className="rounded-lg bg-primary/10 p-2 text-primary"><PenLine className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">Submit a reflection</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">Record what you learned this week.</span></span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></button></DialogTrigger>
            <Link to="/calculator" className="group flex min-w-0 items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus:outline-none focus:ring-2 focus:ring-primary/40"><span className="rounded-lg bg-primary/10 p-2 text-primary"><Calculator className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">Practice calculations</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">Build technical confidence.</span></span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link>
            <Link to="/documents" className="group flex min-w-0 items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus:outline-none focus:ring-2 focus:ring-primary/40"><span className="rounded-lg bg-primary/10 p-2 text-primary"><BookOpen className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">Review company documents</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">Study approved references.</span></span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Learning progress</CardTitle><p className="text-sm text-muted-foreground">Your current reflection record.</p></CardHeader>
          <CardContent className="grid grid-cols-2 divide-x divide-border/60"><Link to="/dashboard" className="p-3 pl-0 transition-colors hover:bg-primary/[0.03]"><PenLine className="h-4 w-4 text-primary" /><p className="mt-2 text-xl font-bold">{reflections.length}</p><p className="text-xs text-muted-foreground">Reflections submitted</p></Link><Link to="/documents" className="p-3 transition-colors hover:bg-primary/[0.03]"><FileText className="h-4 w-4 text-primary" /><p className="mt-2 text-sm font-semibold">Study references</p><p className="text-xs text-muted-foreground">Open the Document Registry</p></Link></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><PenLine className="h-4 w-4 text-primary" /> My learning reflections</CardTitle><p className="text-sm text-muted-foreground">Your submitted reflections and supervisor feedback.</p></CardHeader>
          <CardContent>{reflections.length > 0 ? <div className="space-y-2">{reflections.map((r: ReflectionRow) => <div key={r.id} className="space-y-1 rounded-lg bg-muted/30 px-3 py-3"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium">{r.title}</p><div className="flex shrink-0 items-center gap-2">{r.week_number && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Week {r.week_number}</span>}<span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span></div></div><p className="line-clamp-2 text-xs text-muted-foreground">{r.reflection}</p>{r.supervisor_feedback && <div className="mt-1 rounded border border-primary/10 bg-primary/5 p-2"><p className="text-[10px] font-medium text-primary">Supervisor feedback</p><p className="text-xs text-muted-foreground">{r.supervisor_feedback}</p></div>}</div>)}</div> : <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground"><FileText className="h-4 w-4 shrink-0" />No reflections yet. Submit your first one above.</div>}</CardContent>
        </Card>

        <DialogContent>
          <DialogHeader><DialogTitle>Submit learning reflection</DialogTitle></DialogHeader>
          <div className="space-y-4"><div className="space-y-2"><Label>Title *</Label><Input value={reflTitle} onChange={(e) => setReflTitle(e.target.value)} placeholder="e.g. Week 3 — Pipe Joining Techniques" /></div><div className="space-y-2"><Label>Week number</Label><Input type="number" value={reflWeek} onChange={(e) => setReflWeek(e.target.value)} placeholder="e.g. 3" min={1} max={52} /></div><div className="space-y-2"><Label>Reflection *</Label><Textarea value={reflText} onChange={(e) => setReflText(e.target.value)} placeholder="What did you learn this week? What challenges did you face?" rows={5} /></div><Button className="w-full" onClick={() => submitReflection.mutate()} disabled={!reflTitle.trim() || !reflText.trim() || submitReflection.isPending}>{submitReflection.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit reflection</Button></div>
        </DialogContent>
      </div>
    </Dialog>
  );
};

export default TraineeDashboard;
