import { useState, useEffect, useRef } from "react";
import { logger } from "@/lib/logger";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  subject: string | null;
  body: string;
  sender_id: string;
  message_type: string;
  created_at: string;
  is_read: boolean;
  recipient_id: string | null;
}

interface Profile {
  user_id: string;
  full_name: string | null;
}

export const NotificationBell = () => {
  const { user, memberships } = useAuth();
  const orgId = memberships[0]?.organization_id;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: unreadMessages = [], refetch } = useQuery<Message[]>({
    queryKey: ["unread-notifications", orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user) return [];
      const { data } = await supabase
        .from("messages")
        .select("id, subject, body, sender_id, message_type, created_at, is_read, recipient_id")
        .eq("organization_id", orgId)
        .eq("is_read", false)
        // Exclude messages this user sent (own broadcasts/replies should not count as unread)
        .neq("sender_id", user.id)
        .or(`recipient_id.eq.${user.id},message_type.eq.broadcast`)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data as Message[]) ?? [];
    },
    enabled: !!orgId && !!user,
    refetchInterval: 15000,
  });

  // Fetch sender profiles
  const senderIds = [...new Set(unreadMessages.map((m) => m.sender_id))];
  const { data: senderProfiles = new Map<string, string>() } = useQuery({
    queryKey: ["notif-sender-profiles", senderIds.join(",")],
    queryFn: async () => {
      if (senderIds.length === 0) return new Map<string, string>();
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", senderIds);
      return new Map<string, string>((data ?? []).map((p) => [p.user_id, p.full_name ?? "Unknown"]));
    },
    enabled: senderIds.length > 0,
  });

  // Realtime with sound + toast notification
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel("notif-bell-global")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        refetch();
        // Trigger system notification if app is in background OR even if open as requested
        import("@/lib/pushNotifications").then(({ showNotification }) => {
          showNotification(payload.new.subject || "New Message", payload.new.body, { messageId: payload.new.id });
        });
        
        // Play notification sound
        try {
          const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 800;
          gain.gain.value = 0.1;
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
          setTimeout(() => {
            const osc2 = ctx.createOscillator();
            osc2.connect(gain);
            osc2.frequency.value = 1000;
            osc2.start();
            osc2.stop(ctx.currentTime + 0.1);
          }, 150);
        } catch (error) {
          logger.error("Failed to play notification sound:", error);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, refetch]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNotificationClick = async (m: Message) => {
    // Mark as read
    const { error } = await supabase.from("messages").update({ is_read: true }).eq("id", m.id);
    if (error) {
      logger.error("Failed to mark message as read:", error);
    }
    // Invalidate all unread message queries to update counts everywhere
    queryClient.invalidateQueries({ queryKey: ["unread-notifications", orgId, user?.id] });
    queryClient.invalidateQueries({ queryKey: ["messages", orgId, user?.id] });
    queryClient.invalidateQueries({ queryKey: ["unread-msg-count", orgId, user?.id] });
    setOpen(false);
    // Navigate to messages page - the chat will be opened there
    navigate("/messages");
  };

  const count = unreadMessages.length;

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 text-sidebar-foreground/60 hover:text-sidebar-foreground"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold animate-pulse">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <p className="text-sm font-medium">Notifications</p>
            {count > 0 && <Badge variant="outline" className="text-[10px]">{count} new</Badge>}
          </div>
          {count === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">All caught up!</div>
          ) : (
            unreadMessages.map((m) => (
              <div
                key={m.id}
                className="px-3 py-2 hover:bg-muted/50 cursor-pointer border-b border-border/50 last:border-0"
                onClick={() => handleNotificationClick(m)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{m.subject || "Message"}</p>
                  <Badge variant="outline" className="text-[10px] capitalize shrink-0">{m.message_type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  From: {senderProfiles.get(m.sender_id) ?? "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-1 break-words">{m.body}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(m.created_at).toLocaleTimeString()}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
