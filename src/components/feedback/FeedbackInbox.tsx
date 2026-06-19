import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Loader2, Bug, Lightbulb, HelpCircle, MoreHorizontal, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { humanizeError } from "@/lib/humanizeError";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_ICON: Record<string, typeof Bug> = {
  bug: Bug, idea: Lightbulb, question: HelpCircle, other: MoreHorizontal,
};

export function FeedbackInbox() {
  const { memberships } = useAuth();
  const orgId = memberships[0]?.organization_id;
  const qc = useQueryClient();
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["feedback-inbox", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await (supabase as any)
        .from("user_feedback")
        .select("id, user_id, category, message, status, admin_reply, page_url, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ id: string; user_id: string; category: string; message: string; status: string; admin_reply: string | null; page_url: string | null; created_at: string }>;
      const userIds = [...new Set(rows.map((r) => r.user_id))];
      if (userIds.length === 0) return rows.map((r) => ({ ...r, full_name: "Unknown" }));
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const m = new Map((profiles ?? []).map((p: { user_id: string; full_name: string | null }) => [p.user_id, p.full_name ?? "Unknown"]));
      return rows.map((r) => ({ ...r, full_name: m.get(r.user_id) ?? "Unknown" }));
    },
    enabled: !!orgId,
  });

  const updateRow = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await (supabase as any).from("user_feedback").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback updated");
      qc.invalidateQueries({ queryKey: ["feedback-inbox", orgId] });
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  const sendReply = async (id: string) => {
    const reply = (replyMap[id] ?? "").trim();
    if (reply.length < 2) { toast.error("Type a short reply first."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await updateRow.mutateAsync({
      id,
      patch: { admin_reply: reply, admin_replied_at: new Date().toISOString(), admin_replied_by: user?.id, status: "resolved" },
    });
    setReplyMap((m) => ({ ...m, [id]: "" }));
  };

  if (isLoading) return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  if (items.length === 0) {
    return <EmptyState icon={MessageSquare} title="No feedback yet" description="Once your team starts sending feedback, it'll appear here for review and reply." />;
  }

  return (
    <div className="space-y-3">
      {items.map((f) => {
        const Icon = CATEGORY_ICON[f.category] ?? MoreHorizontal;
        return (
          <Card key={f.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="h-4 w-4" /> {f.full_name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {f.category} · {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                    {f.page_url && <> · <span className="font-mono">{f.page_url}</span></>}
                  </CardDescription>
                </div>
                <Select value={f.status} onValueChange={(v) => updateRow.mutate({ id: f.id, patch: { status: v } })}>
                  <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm whitespace-pre-wrap">{f.message}</p>
              {f.admin_reply ? (
                <div className="rounded-md bg-primary/5 border border-primary/20 p-2 text-sm">
                  <Badge variant="default" className="text-[10px] mb-1">Reply sent</Badge>
                  <p className="whitespace-pre-wrap">{f.admin_reply}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    value={replyMap[f.id] ?? ""}
                    onChange={(e) => setReplyMap((m) => ({ ...m, [f.id]: e.target.value }))}
                    placeholder="Write a reply to the user..."
                    rows={2}
                  />
                  <Button size="sm" onClick={() => sendReply(f.id)} disabled={updateRow.isPending}>
                    Send reply & mark resolved
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}