import { formatDistanceToNow } from "date-fns";
import { CircleDot, Check, X, MessageSquare, Send, Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimelineEventType =
  | "submitted"
  | "viewed"
  | "commented"
  | "approved"
  | "rejected"
  | "edited"
  | "status_changed";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  actor: string;
  message?: string;
  at: string | Date;
}

const META: Record<TimelineEventType, { icon: typeof Check; tone: string; verb: string }> = {
  submitted: { icon: Send, tone: "text-primary", verb: "submitted this" },
  viewed: { icon: Eye, tone: "text-muted-foreground", verb: "opened this" },
  commented: { icon: MessageSquare, tone: "text-foreground", verb: "left a note" },
  approved: { icon: Check, tone: "text-success", verb: "approved this" },
  rejected: { icon: X, tone: "text-destructive", verb: "rejected this" },
  edited: { icon: Pencil, tone: "text-muted-foreground", verb: "edited this" },
  status_changed: { icon: CircleDot, tone: "text-foreground", verb: "changed the status" },
};

/**
 * Activity feed for any submitted record. Senders see who reviewed
 * and acted on their submission; reviewers see the full audit trail.
 */
export function SubmissionTimeline({
  events,
  emptyText = "No activity yet.",
  className,
}: {
  events: TimelineEvent[];
  emptyText?: string;
  className?: string;
}) {
  if (!events.length) {
    return <p className={cn("text-xs text-muted-foreground italic", className)}>{emptyText}</p>;
  }

  return (
    <ol className={cn("space-y-3", className)}>
      {events.map((e) => {
        const meta = META[e.type];
        const Icon = meta.icon;
        const when = typeof e.at === "string" ? new Date(e.at) : e.at;
        return (
          <li key={e.id} className="flex gap-3">
            <div className={cn("h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0", meta.tone)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{e.actor}</span>{" "}
                <span className="text-muted-foreground">{meta.verb}</span>
              </p>
              {e.message && (
                <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{e.message}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatDistanceToNow(when, { addSuffix: true })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}