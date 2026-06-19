import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Standard loading skeletons. Pick the variant that matches the
 * final layout so the page doesn't shift when data arrives.
 *
 *   <LoadingState variant="list"  rows={5} />
 *   <LoadingState variant="table" rows={6} columns={5} />
 *   <LoadingState variant="cards" rows={6} />
 *   <LoadingState variant="form"  rows={4} />
 *   <LoadingState variant="page" />
 */
export type LoadingVariant = "list" | "table" | "cards" | "form" | "page" | "inline";

export interface LoadingStateProps {
  variant?: LoadingVariant;
  rows?: number;
  columns?: number;
  className?: string;
  label?: string;
}

export function LoadingState({
  variant = "list",
  rows = 4,
  columns = 4,
  className,
  label = "Loading…",
}: LoadingStateProps) {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)} aria-busy="true">
        <span className="inline-block h-3 w-3 rounded-full bg-muted animate-pulse" />
        {label}
      </div>
    );
  }

  if (variant === "page") {
    return (
      <div className={cn("p-4 md:p-6 space-y-4", className)} aria-busy="true" aria-label={label}>
        <Skeleton className="h-7 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <LoadingState variant="list" rows={rows} />
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className={cn("space-y-4", className)} aria-busy="true" aria-label={label}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", className)} aria-busy="true" aria-label={label}>
        {Array.from({ length: rows }).map((_, i) => (
          <Card key={i} className="p-4 space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("rounded-md border", className)} aria-busy="true" aria-label={label}>
        <div className="hidden md:grid border-b px-4 py-3 gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid border-b last:border-b-0 px-4 py-3 gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className={cn("h-4", c === 0 ? "w-3/4" : "w-1/2")} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // list (default)
  return (
    <div className={cn("space-y-2", className)} aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} className="p-3 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </Card>
      ))}
    </div>
  );
}