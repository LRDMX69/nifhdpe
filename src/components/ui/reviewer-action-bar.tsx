import { useState } from "react";
import { Check, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Sticky bottom action bar shown to reviewers/approvers on any
 * submitted record. Encapsulates the standard Approve / Reject /
 * Request changes flow with an optional comment.
 *
 * Hide entirely for senders — pass `visible={false}` or simply do
 * not render it. This keeps sender and reviewer experiences clearly
 * separated as required by the workflow redesign.
 */
export function ReviewerActionBar({
  onApprove,
  onReject,
  onRequestChanges,
  busy,
  className,
  approveLabel = "Approve",
  rejectLabel = "Reject",
  requireNoteOnReject = true,
}: {
  onApprove: (note?: string) => void | Promise<void>;
  onReject: (note: string) => void | Promise<void>;
  onRequestChanges?: (note: string) => void | Promise<void>;
  busy?: boolean;
  className?: string;
  approveLabel?: string;
  rejectLabel?: string;
  requireNoteOnReject?: boolean;
}) {
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  const handleReject = () => {
    if (requireNoteOnReject && !note.trim()) {
      setShowNote(true);
      return;
    }
    onReject(note.trim());
  };

  return (
    <Card
      className={cn(
        "sticky bottom-0 md:bottom-4 z-20 p-3 shadow-lg border-primary/20 bg-card/95 backdrop-blur",
        className,
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">Reviewer actions</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowNote((s) => !s)}
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            {showNote ? "Hide note" : "Add note"}
          </Button>
        </div>
        {showNote && (
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note to the submitter…"
            rows={2}
            className="text-sm"
          />
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => onApprove(note.trim() || undefined)}
            disabled={busy}
            className="flex-1 min-w-[120px]"
          >
            <Check className="h-4 w-4" /> {approveLabel}
          </Button>
          {onRequestChanges && (
            <Button
              variant="outline"
              onClick={() => {
                if (!note.trim()) { setShowNote(true); return; }
                onRequestChanges(note.trim());
              }}
              disabled={busy}
              className="flex-1 min-w-[120px]"
            >
              Request changes
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={busy}
            className="flex-1 min-w-[120px]"
          >
            <X className="h-4 w-4" /> {rejectLabel}
          </Button>
        </div>
      </div>
    </Card>
  );
}