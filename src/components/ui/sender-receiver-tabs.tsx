import { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox, Send } from "lucide-react";

/**
 * Standard "My Submissions" vs "Inbox" split used on every
 * workflow page (Claims, Equipment Requests, Leaves, Field
 * Reports, Print Requests, Material Requisitions).
 *
 * - Senders (no `isReviewer`) see only "My Submissions" — no tabs.
 * - Reviewers see both tabs with badge counts so the receiver
 *   experience is distinct from the sender experience.
 */
export function SenderReceiverTabs({
  isReviewer,
  mineCount,
  inboxCount,
  mineView,
  inboxView,
  defaultTab,
  mineLabel = "My Submissions",
  inboxLabel = "Inbox",
}: {
  isReviewer: boolean;
  mineCount?: number;
  inboxCount?: number;
  mineView: ReactNode;
  inboxView: ReactNode;
  defaultTab?: "mine" | "inbox";
  mineLabel?: string;
  inboxLabel?: string;
}) {
  if (!isReviewer) return <>{mineView}</>;

  return (
    <Tabs defaultValue={defaultTab ?? "inbox"} className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="inbox" className="gap-2">
          <Inbox className="h-4 w-4" />
          {inboxLabel}
          {typeof inboxCount === "number" && inboxCount > 0 && (
            <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 font-bold">
              {inboxCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="mine" className="gap-2">
          <Send className="h-4 w-4" />
          {mineLabel}
          {typeof mineCount === "number" && mineCount > 0 && (
            <span className="ml-1 text-[10px] text-muted-foreground">{mineCount}</span>
          )}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="inbox" className="mt-4">{inboxView}</TabsContent>
      <TabsContent value="mine" className="mt-4">{mineView}</TabsContent>
    </Tabs>
  );
}