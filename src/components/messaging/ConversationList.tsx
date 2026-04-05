import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone } from "lucide-react";

interface Conversation {
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string | null;
  recipientRole?: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  broadcasts: any[];
  onSelectChat: (conv: Conversation) => void;
  onSelectBroadcasts: () => void;
}

export const ConversationList = ({ conversations, broadcasts, onSelectChat, onSelectBroadcasts }: ConversationListProps) => {
  const getInitials = (name: string) => (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2);

  return (
    <div className="space-y-1">
      {/* Broadcasts section */}
      {broadcasts.length > 0 && (
        <Card
          className="cursor-pointer hover:border-primary/20 transition-colors"
          onClick={onSelectBroadcasts}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Announcements</p>
                {broadcasts.filter((b: any) => !b.is_read).length > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-[10px]">
                    {broadcasts.filter((b: any) => !b.is_read).length}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {broadcasts[0]?.body ?? "No announcements"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Direct conversations */}
      {conversations.length === 0 && broadcasts.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No conversations yet.</p>
      )}
      {conversations.map((conv) => (
        <Card
          key={conv.recipientId}
          className={`cursor-pointer transition-colors ${conv.unreadCount > 0 ? "border-primary/30 bg-primary/5" : "hover:border-primary/20"}`}
          onClick={() => onSelectChat(conv)}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              {conv.recipientAvatar && <AvatarImage src={conv.recipientAvatar} />}
              <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(conv.recipientName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{conv.recipientName}</p>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(conv.lastTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                {conv.unreadCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-[10px] shrink-0">{conv.unreadCount}</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
