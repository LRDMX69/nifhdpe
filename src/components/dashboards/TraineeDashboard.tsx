import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Plus, Loader2, PenLine, Calculator } from "lucide-react";
import { useGsapFadeUp } from "@/hooks/useGsapAnimation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS } from "@/lib/constants";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { humanizeError } from "@/lib/humanizeError";

type ReflectionRow = Database["public"]["Tables"]["learning_reflections"]["Row"];

const TraineeDashboard = () => {
  const { user, profile, activeRole, memberships } = useAuth();
  const headerRef = useGsapFadeUp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = memberships[0]?.organization_id;

  // Reflection form
  const [reflOpen, setReflOpen] = useState(false);
  const [reflTitle, setReflTitle] = useState("");
  const [reflText, setReflText] = useState("");
  const [reflWeek, setReflWeek] = useState("");

  const { data: reflections = [] } = useQuery({
    queryKey: ["learning-reflections", orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user) return [];
      const { data } = await supabase
        .from("learning_reflections")
        .select("*")
        .eq("organization_id", orgId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as ReflectionRow[];
    },
    enabled: !!orgId && !!user,
  });

  const submitReflection = useMutation({
    mutationFn: async () => {
      if (!orgId || !user) throw new Error("Not authenticated");
      if (!reflTitle.trim() || !reflText.trim()) throw new Error("Title and reflection are required");
      const { error } = await supabase.from("learning_reflections").insert({
        organization_id: orgId,
        user_id: user.id,
        title: reflTitle.trim(),
        reflection: reflText.trim(),
        week_number: reflWeek ? parseInt(reflWeek) : null,
      });
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
    <div className="space-y-6">
      <div ref={headerRef} className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{roleLabel} Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Welcome, {profile?.full_name?.split(" ")[0] ?? "Trainee"} — access learning materials and submit reflections.
          </p>
        </div>
        <Dialog open={reflOpen} onOpenChange={setReflOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Submit Reflection</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Learning Reflection</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={reflTitle} onChange={e => setReflTitle(e.target.value)} placeholder="e.g. Week 3 — Pipe Joining Techniques" />
              </div>
              <div className="space-y-2">
                <Label>Week Number</Label>
                <Input type="number" value={reflWeek} onChange={e => setReflWeek(e.target.value)} placeholder="e.g. 3" min={1} max={52} />
              </div>
              <div className="space-y-2">
                <Label>Reflection *</Label>
                <Textarea value={reflText} onChange={e => setReflText(e.target.value)} placeholder="What did you learn this week? What challenges did you face?" rows={5} />
              </div>
              <Button className="w-full" onClick={() => submitReflection.mutate()} disabled={!reflTitle.trim() || !reflText.trim() || submitReflection.isPending}>
                {submitReflection.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Submit Reflection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary"><PenLine className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-bold">{reflections.length}</p>
              <p className="text-xs text-muted-foreground">My Reflections</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate("/calculator")}>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary"><Calculator className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-medium">Pipe Calculator</p>
              <p className="text-xs text-muted-foreground">Practice calculations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Reflections */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" /> My Learning Reflections
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reflections.length > 0 ? (
            <div className="space-y-2">
              {reflections.map((r: ReflectionRow) => (
                <div key={r.id} className="py-3 px-3 rounded-lg bg-muted/30 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.week_number && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Week {r.week_number}</span>}
                      <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.reflection}</p>
                  {r.supervisor_feedback && (
                    <div className="mt-1 p-2 rounded bg-primary/5 border border-primary/10">
                      <p className="text-[10px] text-primary font-medium">Supervisor Feedback:</p>
                      <p className="text-xs text-muted-foreground">{r.supervisor_feedback}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No reflections submitted yet. Click "Submit Reflection" to get started.</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default TraineeDashboard;
