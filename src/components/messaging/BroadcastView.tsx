import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Megaphone, Clock } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface BroadcastViewProps {
  broadcasts: any[];
  profileMap: Map<string, any>;
  onBack: () => void;
}

export const BroadcastView = ({ broadcasts, profileMap, onBack }: BroadcastViewProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Mark unread broadcasts as read
  useEffect(() => {
    if (!user) return;
    const unread = broadcasts.filter(b => !b.is_read);
    if (unread.length > 0) {
      supabase.from("messages").update({ is_read: true }).in("id", unread.map(b => b.id)).then(() => {
        queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
        queryClient.invalidateQueries({ queryKey: ["messages"] });
      });
    }
  }, [broadcasts, user, queryClient]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-3 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Megaphone className="h-5 w-5 text-primary" />
        <p className="text-sm font-medium">Announcements</p>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {broadcasts.map((b: any) => {
            const sender = profileMap.get(b.sender_id);
            return (
              <Card key={b.id}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{b.subject || "Announcement"}</p>
                    {!b.is_read && <Badge className="bg-primary text-primary-foreground text-[10px]">New</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">From: {sender?.full_name ?? "System"}</p>
                  <p className="text-sm break-words">{b.body}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />{new Date(b.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
