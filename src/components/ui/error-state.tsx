import { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Standard error surface for any failed data load.
 * Always show the user:
 *   1. plain-language statement of what failed
 *   2. a retry path
 *   3. (optionally) the technical detail for support
 *
 * Never expose raw stack traces or PostgREST error codes by default.
 */
export interface ErrorStateProps {
  title?: string;
  description?: ReactNode;
  error?: unknown;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  compact?: boolean;
}

function extractMessage(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return null;
}

export function ErrorState({
  title = "Couldn't load this section",
  description = "Something went wrong on our side. Please try again — if the problem keeps happening, contact your administrator.",
  error,
  onRetry,
  retryLabel = "Try again",
  className,
  compact = false,
}: ErrorStateProps) {
  const detail = extractMessage(error);

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-lg border border-destructive/30 bg-destructive/5",
        compact ? "p-6 gap-3" : "p-10 gap-4",
        className,
      )}
    >
      <div className="rounded-full bg-destructive/10 p-3 text-destructive">
        <AlertTriangle className={compact ? "h-5 w-5" : "h-6 w-6"} />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h3 className={cn("font-semibold text-foreground", compact ? "text-base" : "text-lg")}>{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        {detail && (
          <details className="pt-1">
            <summary className="text-xs text-muted-foreground/70 cursor-pointer hover:text-muted-foreground">
              Technical detail
            </summary>
            <pre className="mt-1 text-[11px] text-left text-muted-foreground/80 bg-muted/50 rounded p-2 overflow-auto max-h-32">
              {detail}
            </pre>
          </details>
        )}
      </div>
      {onRetry && (
        <Button onClick={onRetry} size={compact ? "sm" : "default"} variant="outline">
          <RefreshCw className="h-4 w-4" /> {retryLabel}
        </Button>
      )}
    </div>
  );
}