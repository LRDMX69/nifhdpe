import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon, Inbox } from "lucide-react";

/**
 * Standard empty-state used everywhere in the ERP.
 *
 * Rule: NEVER show "No data". Always tell the user
 *   1. what this list/table represents
 *   2. who is responsible for creating the first record
 *   3. what they should do next
 */
export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: ReactNode;
  ownedBy?: string;
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  ownedBy,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-lg border border-dashed border-border bg-card/40",
        compact ? "p-6 gap-3" : "p-10 gap-4",
        className
      )}
    >
      <div className="rounded-full bg-primary/10 p-3 text-primary">
        <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h3 className={cn("font-semibold text-foreground", compact ? "text-base" : "text-lg")}>{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        {ownedBy && (
          <p className="text-xs text-muted-foreground/80 italic pt-1">
            Managed by: <span className="font-medium text-foreground/80 not-italic">{ownedBy}</span>
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {action && (
            <Button onClick={action.onClick} disabled={action.disabled} size={compact ? "sm" : "default"}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" size={compact ? "sm" : "default"} onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}