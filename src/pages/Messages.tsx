import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Megaphone, Loader2, Bell, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ChatView } from "@/components/messaging/ChatView";
import type { Database } from "@/integrations/supabase/types";
import { ConversationList } from "@/components/messaging/ConversationList";
import { BroadcastView } from "@/components/messaging/BroadcastView";

type ViewState = { type: "list" } | { type: "chat"; recipientId: string; recipientName: string; recipientAvatar?: string | null; recipientRole?: string } | { type: "broadcasts" };

const Messages = () => {
  const { user, activeRole, memberships, isMaintenance } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = memberships[0]?.organization_id;
  const isAdmin = activeRole === "administrator" || isMaintenance;

  const [view, setView] = useState<ViewState>({ type: "list" });
  const [composeOpen, setComposeOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [msgContent, setMsgContent] = useState("");
  const [msgSubject, setMsgSubject] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all messages for current user
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["messages", orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user) return [];
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    enabled: !!orgId && !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        refetchMessages();
        // Try to play notification sound - wrapped in try/catch to handle autoplay restrictions
        try {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.3);
        } catch (e) {
          // Audio context blocked by browser - user must interact first
          console.debug("Audio notification blocked by browser autoplay policy");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, refetchMessages]);

  // Team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members-msg", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.rpc("get_visible_members", { _org_id: orgId });
      if (!data) return [];
      const userIds = data.map((m: { user_id: string }) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
      const profileMap = new Map((profiles ?? []).map((p: { user_id: string; full_name: string; avatar_url: string | null }) => [p.user_id, p]));
      return data
        .filter((m: { user_id: string }) => m.user_id !== user?.id)
        .map((m: { user_id: string; role?: string }) => ({
          ...m,
          full_name: profileMap.get(m.user_id)?.full_name ?? "Unknown",
          avatar_url: profileMap.get(m.user_id)?.avatar_url,
        }));
    },
    enabled: !!orgId,
  });

  // Profile map
  const { data: profileMap = new Map() } = useQuery({
    queryKey: ["profiles-msg-map", orgId],
    queryFn: async () => {
      if (!orgId) return new Map();
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").eq("organization_id", orgId);
      return new Map((profiles ?? []).map((p: { user_id: string; full_name: string; avatar_url: string | null }) => [p.user_id, p]));
    },
    enabled: !!orgId,
  });

  // Build conversation list from direct messages
  const directMessages = messages.filter((m: Database["public"]["Tables"]["messages"]["Row"]) => m.message_type === "direct");
  const broadcasts = messages.filter((m: Database["public"]["Tables"]["messages"]["Row"]) => m.message_type === "broadcast");

  const conversationMap = new Map<string, { lastMsg: Database["public"]["Tables"]["messages"]["Row"]; unread: number }>();
  directMessages.forEach((m: Database["public"]["Tables"]["messages"]["Row"]) => {
    const otherId = m.sender_id === user?.id ? m.recipient_id : m.sender_id;
    if (!otherId) return;
    const existing = conversationMap.get(otherId);
    if (!existing || new Date(m.created_at) > new Date(existing.lastMsg.created_at)) {
      conversationMap.set(otherId, {
        lastMsg: m,
        unread: (existing?.unread ?? 0) + (!m.is_read && m.recipient_id === user?.id ? 1 : 0),
      });
    } else if (!m.is_read && m.recipient_id === user?.id) {
      existing.unread += 1;
    }
  });

  const conversations = Array.from(conversationMap.entries()).map(([rid, { lastMsg, unread }]) => {
    const profile = profileMap.get(rid);
    const member = teamMembers.find((m: { user_id: string }) => m.user_id === rid);
    return {
      recipientId: rid,
      recipientName: profile?.full_name ?? "Unknown",
      recipientAvatar: profile?.avatar_url,
      recipientRole: member?.role,
      lastMessage: lastMsg.body,
      lastTime: lastMsg.created_at,
      unreadCount: unread,
    };
  }).sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0) + broadcasts.filter((b: Database["public"]["Tables"]["messages"]["Row"]) => !b.is_read).length;

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return conv.recipientName.toLowerCase().includes(query) || conv.lastMessage.toLowerCase().includes(query);
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!orgId || !user || !msgContent.trim() || !recipientId) throw new Error("Missing fields");
      const { error } = await supabase.from("messages").insert({
        organization_id: orgId, sender_id: user.id, recipient_id: recipientId,
        subject: msgSubject || "Direct Message", body: msgContent, message_type: "direct",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Message sent" });
      const member = teamMembers.find((m: { user_id: string; full_name?: string; avatar_url?: string | null; role?: string }) => m.user_id === recipientId);
      setComposeOpen(false);
      setMsgContent(""); setMsgSubject(""); 
      refetchMessages();
      // Open the chat with this person
      setView({
        type: "chat",
        recipientId,
        recipientName: member?.full_name ?? "Unknown",
        recipientAvatar: member?.avatar_url,
        recipientRole: member?.role,
      });
      setRecipientId("");
    },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const sendBroadcast = useMutation({
    mutationFn: async () => {
      if (!orgId || !user || !msgContent.trim()) throw new Error("Content required");
      const { error } = await supabase.from("messages").insert({
        organization_id: orgId, sender_id: user.id, subject: msgSubject || "Announcement",
        body: msgContent, message_type: "broadcast",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Broadcast sent" });
      setBroadcastOpen(false);
      setMsgContent(""); setMsgSubject("");
      refetchMessages();
    },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Full-height chat view
  if (view.type === "chat") {
    return (
      <div className="h-[calc(100vh-3.5rem)] md:h-screen flex flex-col">
        <ChatView
          recipientId={view.recipientId}
          recipientName={view.recipientName}
          recipientAvatar={view.recipientAvatar}
          recipientRole={view.recipientRole}
          orgId={orgId!}
          onBack={() => setView({ type: "list" })}
        />
      </div>
    );
  }

  if (view.type === "broadcasts") {
    return (
      <div className="h-[calc(100vh-3.5rem)] md:h-screen flex flex-col">
        <BroadcastView
          broadcasts={broadcasts}
          profileMap={profileMap}
          onBack={() => setView({ type: "list" })}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <PageHeader title="Messages" description={totalUnread > 0 ? `${totalUnread} unread` : "Internal communication"}>
        <div className="flex gap-2 flex-wrap">
          {totalUnread > 0 && (
            <Badge variant="destructive" className="gap-1"><Bell className="h-3 w-3" />{totalUnread}</Badge>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-8 w-48 sm:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Send className="h-4 w-4 mr-1" />New Chat</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Message</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>To</Label>
                  <Select value={recipientId} onValueChange={setRecipientId}>
                    <SelectTrigger><SelectValue placeholder="Select recipient" /></SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((m: { user_id: string; full_name: string; role?: string }) => (
                        <SelectItem key={m.user_id} value={m.user_id}>{m.full_name} ({m.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Message</Label><Textarea value={msgContent} onChange={e => setMsgContent(e.target.value)} rows={3} placeholder="Type your message..." /></div>
                <Button className="w-full" onClick={() => sendMessage.mutate()} disabled={!msgContent.trim() || !recipientId || sendMessage.isPending}>
                  {sendMessage.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Send
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {isAdmin && (
            <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Megaphone className="h-4 w-4 mr-1" />Broadcast</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Broadcast Announcement</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Subject</Label><Input value={msgSubject} onChange={e => setMsgSubject(e.target.value)} placeholder="Announcement title" /></div>
                  <div className="space-y-2"><Label>Message</Label><Textarea value={msgContent} onChange={e => setMsgContent(e.target.value)} rows={4} placeholder="Your announcement..." /></div>
                  <Button className="w-full" onClick={() => sendBroadcast.mutate()} disabled={!msgContent.trim() || sendBroadcast.isPending}>
                    {sendBroadcast.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Megaphone className="h-4 w-4 mr-2" />}Send
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </PageHeader>

      <ConversationList
        conversations={filteredConversations}
        broadcasts={broadcasts}
        onSelectChat={(conv) => setView({
          type: "chat",
          recipientId: conv.recipientId,
          recipientName: conv.recipientName,
          recipientAvatar: conv.recipientAvatar,
          recipientRole: conv.recipientRole,
        })}
        onSelectBroadcasts={() => setView({ type: "broadcasts" })}
      />
    </div>
  );
};

export default Messages;
