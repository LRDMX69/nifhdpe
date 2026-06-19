import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Inbox, Send } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { SenderReceiverTabs } from "@/components/ui/sender-receiver-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

type LeaveRow = Database["public"]["Tables"]["leave_requests"]["Row"];

interface LeavesTabProps {
  leaveRequests: LeaveRow[];
  profileMap: Map<string, { full_name: string; avatar_url: string | null }>;
  isHrOrAdmin: boolean;
  onUpdateLeave: (id: string, status: string) => void;
}

export const LeavesTab = ({ leaveRequests, profileMap, isHrOrAdmin, onUpdateLeave }: LeavesTabProps) => {
  const { user } = useAuth();
  const myLeaves = leaveRequests.filter((l) => l.user_id === user?.id);
  const inboxLeaves = isHrOrAdmin
    ? leaveRequests.filter((l) => l.user_id !== user?.id)
    : [];
  const inboxPending = inboxLeaves.filter((l) => l.status === "pending").length;

  const renderRow = (l: LeaveRow, kind: "mine" | "inbox") => {
    const requesterName = profileMap.get(l.user_id)?.full_name;
    return (
      <div
        key={l.id}
        className="flex items-center justify-between py-3 px-3 rounded-lg bg-muted/30 gap-2 flex-wrap"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm capitalize font-medium">{l.leave_type} leave</p>
            {kind === "inbox" && requesterName && (
              <span className="text-xs text-muted-foreground">— {requesterName}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{l.start_date} → {l.end_date}</p>
          {l.reason && <p className="text-xs text-muted-foreground mt-1">{l.reason}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {kind === "inbox" && isHrOrAdmin && l.status === "pending" && (
            <>
              <Button size="sm" variant="outline" className="h-6 text-[10px] text-primary" onClick={() => onUpdateLeave(l.id, "approved")}>
                Approve
              </Button>
              <Button size="sm" variant="outline" className="h-6 text-[10px] text-destructive" onClick={() => onUpdateLeave(l.id, "rejected")}>
                Reject
              </Button>
            </>
          )}
          <StatusBadge status={l.status} />
        </div>
      </div>
    );
  };

  const mineView = (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" /> My Leave Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        {myLeaves.length > 0 ? (
          <div className="space-y-2">{myLeaves.map((l) => renderRow(l, "mine"))}</div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="You haven't requested any leave"
            description="Submit a leave request when you need time off. HR or your administrator will review and respond — you'll see the status update here."
          />
        )}
      </CardContent>
    </Card>
  );

  const inboxView = (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Inbox className="h-5 w-5 text-warning" /> Leave Requests Inbox
        </CardTitle>
      </CardHeader>
      <CardContent>
        {inboxLeaves.length > 0 ? (
          <div className="space-y-2">{inboxLeaves.map((l) => renderRow(l, "inbox"))}</div>
        ) : (
          <EmptyState
            icon={Inbox}
            title="No leave requests to review"
            description="When team members request time off, their submissions appear here for your approval."
          />
        )}
      </CardContent>
    </Card>
  );

  return (
    <SenderReceiverTabs
      isReviewer={isHrOrAdmin}
      mineCount={myLeaves.length}
      inboxCount={inboxPending}
      mineView={mineView}
      inboxView={inboxView}
    />
  );
};
