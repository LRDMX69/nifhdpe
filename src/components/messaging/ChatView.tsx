import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft, Loader2, Trash2, MoreVertical } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Database } from "@/integrations/supabase/types";

interface ChatViewProps {
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string | null;
  recipientRole?: string;
  orgId: string;
  onBack: () => void;
}

export const ChatView = ({ recipientId, recipientName, recipientAvatar, recipientRole, orgId, onBack }: ChatViewProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const getInitials = (name: string) => (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2);

  // Fetch conversation between current user and recipient
  const { data: messages = [], refetch } = useQuery({
    queryKey: ["chat", user?.id, recipientId, orgId],
    queryFn: async () => {
      if (!user || !orgId) return [];
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("organization_id", orgId)
        .eq("message_type", "direct")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!user && !!orgId,
    refetchInterval: 5000,
  });

  // Mark unread messages as read
  useEffect(() => {
    if (!user || messages.length === 0) return;
    const unread = messages.filter((m: any) => m.recipient_id === user.id && !m.is_read);
    if (unread.length > 0) {
      const ids = unread.map((m: any) => m.id);
      supabase.from("messages").update({ is_read: true }).in("id", ids).then(() => {
        queryClient.invalidateQueries({ queryKey: ["messages", orgId, user?.id] });
        queryClient.invalidateQueries({ queryKey: ["unread-msg-count", orgId, user?.id] });
      });
    }
  }, [messages, user, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`chat-${recipientId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, recipientId, refetch]);

  const sendMsg = useMutation({
    mutationFn: async () => {
      if (!user || !message.trim()) return;
      const { error } = await supabase.from("messages").insert({
        organization_id: orgId,
        sender_id: user.id,
        recipient_id: recipientId,
        subject: "Direct Message",
        body: message.trim(),
        message_type: "direct",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      refetch();
    },
  });

  const deleteMsg = useMutation({
    mutationFn: async (msgId: string) => {
      const { error } = await supabase.from("messages").delete().eq("id", msgId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
    },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-8 w-8">
          {recipientAvatar && <AvatarImage src={recipientAvatar} />}
          <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(recipientName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{recipientName}</p>
          {recipientRole && <p className="text-[10px] text-muted-foreground capitalize">{recipientRole}</p>}
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Start the conversation.</p>
          )}
          {messages.map((m: Database["public"]["Tables"]["messages"]["Row"]) => {
            const isMine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                  <div className="flex items-start gap-2">
                    <p className="break-words flex-1">{m.body}</p>
                    {isMine && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-50 hover:opacity-100">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => deleteMsg.mutate(m.id)} className="text-destructive">
                            <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card shrink-0">
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); sendMsg.mutate(); }}
        >
          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            autoFocus
          />
          <Button type="submit" size="icon" disabled={!message.trim() || sendMsg.isPending}>
            {sendMsg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
};
