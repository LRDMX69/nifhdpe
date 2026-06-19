import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProgressStep {
  key: string;
  label: string;
  description?: string;
}

interface ProgressTrackerProps {
  steps: ProgressStep[];
  currentStepKey: string;
  rejected?: boolean;
  className?: string;
}

/**
 * Horizontal progress tracker showing the lifecycle of a record
 * (e.g. Submitted → Under Review → Approved → Completed).
 * Use it at the top of any record detail page so the sender and
 * reviewer both see exactly where the workflow stands.
 */
export function ProgressTracker({ steps, currentStepKey, rejected, className }: ProgressTrackerProps) {
  const currentIndex = Math.max(0, steps.findIndex((s) => s.key === currentStepKey));

  return (
    <div className={cn("w-full", className)}>
      <ol className="flex items-start gap-2 overflow-x-auto pb-2">
        {steps.map((step, idx) => {
          const isComplete = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isRejectedHere = rejected && isCurrent;
          return (
            <li key={step.key} className="flex-1 min-w-[120px]">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 border",
                    isRejectedHere && "bg-destructive text-destructive-foreground border-destructive",
                    !isRejectedHere && isComplete && "bg-success text-success-foreground border-success",
                    !isRejectedHere && isCurrent && "bg-primary text-primary-foreground border-primary animate-pulse",
                    !isComplete && !isCurrent && "bg-muted text-muted-foreground border-border",
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 rounded",
                      isComplete ? "bg-success" : "bg-border",
                    )}
                  />
                )}
              </div>
              <div className="mt-2">
                <p
                  className={cn(
                    "text-xs font-medium",
                    isCurrent ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 hidden sm:block">
                    {step.description}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}