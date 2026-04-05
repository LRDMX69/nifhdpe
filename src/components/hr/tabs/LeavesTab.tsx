import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

interface LeavesTabProps {
  leaveRequests: Database["public"]["Tables"]["leave_requests"]["Row"][];
  profileMap: Map<string, { full_name: string; avatar_url: string | null }>;
  isHrOrAdmin: boolean;
  onUpdateLeave: (id: string, status: string) => void;
}

export const LeavesTab = ({ leaveRequests, profileMap, isHrOrAdmin, onUpdateLeave }: LeavesTabProps) => {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-warning" /> Leave Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leaveRequests.length > 0 ? (
          <div className="space-y-2">
            {leaveRequests.map((l) => {
              const requesterName = profileMap.get(l.user_id)?.full_name;
              return (
                <div 
                  key={l.id} 
                  className="flex items-center justify-between py-3 px-3 rounded-lg bg-muted/30 gap-2 flex-wrap"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm capitalize font-medium">{l.leave_type} leave</p>
                      {isHrOrAdmin && requesterName && (
                        <span className="text-xs text-muted-foreground">— {requesterName}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{l.start_date} → {l.end_date}</p>
                    {l.reason && <p className="text-xs text-muted-foreground mt-1">{l.reason}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isHrOrAdmin && l.status === "pending" && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-6 text-[10px] text-primary" 
                          onClick={() => onUpdateLeave(l.id, "approved")}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-6 text-[10px] text-destructive" 
                          onClick={() => onUpdateLeave(l.id, "rejected")}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] capitalize ${
                        l.status === "approved" ? "text-primary" : 
                        l.status === "rejected" ? "text-destructive" : "text-warning"
                      }`}
                    >
                      {l.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No leave requests.</p>
        )}
      </CardContent>
    </Card>
  );
};
