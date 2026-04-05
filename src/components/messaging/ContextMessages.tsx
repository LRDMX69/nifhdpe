import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ContextMessagesProps {
  contextType: string; // "field_report" | "worker_claim" | "project"
  contextId: string;
  orgId: string;
}

export const ContextMessages = ({ contextType, contextId, orgId }: ContextMessagesProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["context-messages", contextType, contextId],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("organization_id", orgId)
        .eq("context_type", contextType)
        .eq("context_id", contextId)
        .eq("message_type", "context")
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!orgId && !!contextId,
  });

  const { data: profileMap = new Map() } = useQuery({
    queryKey: ["context-msg-profiles", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").eq("organization_id", orgId);
      return new Map((data ?? []).map((p: any) => [p.user_id, p.full_name]));
    },
    enabled: !!orgId,
  });

  const sendMsg = useMutation({
    mutationFn: async () => {
      if (!user || !message.trim()) return;
      const { error } = await supabase.from("messages").insert({
        organization_id: orgId,
        sender_id: user.id,
        subject: `Re: ${contextType}`,
        body: message.trim(),
        message_type: "context",
        context_type: contextType,
        context_id: contextId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["context-messages", contextType, contextId] });
    },
  });

  const getInitials = (name: string) => (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2);

  return (
    <div className="border border-border rounded-lg mt-4">
      <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium">Discussion ({messages.length})</span>
      </div>

      {messages.length > 0 && (
        <ScrollArea className="max-h-48 p-3">
          <div className="space-y-2">
            {messages.map((m: any) => {
              const isMine = m.sender_id === user?.id;
              const name = profileMap.get(m.sender_id) ?? "Unknown";
              return (
                <div key={m.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{getInitials(name)}</AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs ${isMine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {!isMine && <p className="font-medium text-[10px] mb-0.5">{name}</p>}
                    <p className="break-words">{m.body}</p>
                    <p className={`text-[9px] mt-0.5 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <form
        className="flex gap-2 p-2 border-t border-border"
        onSubmit={(e) => { e.preventDefault(); sendMsg.mutate(); }}
      >
        <Input
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 h-8 text-xs"
        />
        <Button type="submit" size="icon" className="h-8 w-8" disabled={!message.trim() || sendMsg.isPending}>
          {sendMsg.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
        </Button>
      </form>
    </div>
  );
};
