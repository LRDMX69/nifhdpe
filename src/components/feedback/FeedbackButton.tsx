import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageSquare, Send, Bug, Lightbulb, HelpCircle, MoreHorizontal, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { humanizeError } from "@/lib/humanizeError";
import { formatDistanceToNow } from "date-fns";

type Category = "bug" | "idea" | "question" | "other";

const CATEGORY_META: Record<Category, { label: string; icon: typeof Bug }> = {
  bug: { label: "Bug report", icon: Bug },
  idea: { label: "Idea / suggestion", icon: Lightbulb },
  question: { label: "Question", icon: HelpCircle },
  other: { label: "Other", icon: MoreHorizontal },
};

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
};

export function FeedbackButton() {
  const { user, memberships, isMaintenance } = useAuth();
  const orgId = memberships[0]?.organization_id;
  const location = useLocation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("bug");
  const [message, setMessage] = useState("");

  const { data: mine = [], isLoading } = useQuery({
    queryKey: ["my-feedback", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("user_feedback")
        .select("id, category, message, status, admin_reply, admin_replied_at, created_at, page_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; category: string; message: string; status: string; admin_reply: string | null; admin_replied_at: string | null; created_at: string; page_url: string | null }>;
    },
    enabled: !!user && open,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user || !orgId) throw new Error("Not signed in to an organization");
      const trimmed = message.trim();
      if (trimmed.length < 3) throw new Error("Please write a few words so we can help.");
      const { error } = await (supabase as any).from("user_feedback").insert({
        user_id: user.id,
        organization_id: orgId,
        category,
        message: trimmed,
        page_url: location.pathname,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback sent", { description: "Thanks — an admin will review this shortly." });
      setMessage("");
      qc.invalidateQueries({ queryKey: ["my-feedback", user?.id] });
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  // Hidden until the user is fully signed-in to an org
  if (!user || (!orgId && !isMaintenance)) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6 z-40 h-12 w-12 rounded-full shadow-lg"
          aria-label="Send feedback"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Send feedback</SheetTitle>
          <SheetDescription>
            Tell us what's broken, what's missing, or what would help. We read every message.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="new" className="flex-1 mt-4 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">New message</TabsTrigger>
            <TabsTrigger value="mine">
              My feedback{mine.length > 0 && <span className="ml-1 text-xs text-muted-foreground">({mine.length})</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4 mt-4 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="fb-category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger id="fb-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_META) as Category[]).map((k) => {
                    const Icon = CATEGORY_META[k].icon;
                    return (
                      <SelectItem key={k} value={k}>
                        <span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {CATEGORY_META[k].label}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fb-message">Your message</Label>
              <Textarea
                id="fb-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe what happened, what you expected, and any steps to reproduce."
                rows={6}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                Sending from <span className="font-mono">{location.pathname}</span> · {message.length}/2000
              </p>
            </div>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending || message.trim().length < 3} className="w-full">
              {submit.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send feedback
            </Button>
          </TabsContent>

          <TabsContent value="mine" className="mt-4 overflow-y-auto space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : mine.length === 0 ? (
              <EmptyState
                title="No feedback yet"
                description="When you send feedback, it'll appear here along with the admin's reply."
                compact
              />
            ) : (
              mine.map((f) => {
                const Icon = CATEGORY_META[f.category as Category]?.icon ?? MoreHorizontal;
                return (
                  <div key={f.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                        <span>{CATEGORY_META[f.category as Category]?.label ?? f.category}</span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}</span>
                      </div>
                      <Badge variant={f.status === "resolved" ? "default" : "secondary"} className="text-[10px]">
                        {STATUS_LABEL[f.status] ?? f.status}
                      </Badge>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{f.message}</p>
                    {f.admin_reply && (
                      <div className="mt-2 rounded-md bg-primary/5 border border-primary/20 p-2 text-sm">
                        <p className="text-[11px] font-semibold text-primary mb-1">Admin reply</p>
                        <p className="whitespace-pre-wrap">{f.admin_reply}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}