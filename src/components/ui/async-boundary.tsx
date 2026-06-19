import { ReactNode } from "react";
import { EmptyState, EmptyStateProps } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState, LoadingVariant } from "@/components/ui/loading-state";

/**
 * Unified async surface — drop this around any data-bound section to
 * guarantee consistent loading, error and empty states across the app.
 *
 *   <AsyncBoundary
 *     loading={isLoading}
 *     error={error}
 *     isEmpty={!rows.length}
 *     onRetry={refetch}
 *     emptyState={{ title: "No claims yet", description: "Submit your first claim from the field." }}
 *     loadingVariant="table"
 *     loadingRows={6}
 *     loadingColumns={5}
 *   >
 *     <ClaimsTable rows={rows} />
 *   </AsyncBoundary>
 */
export interface AsyncBoundaryProps {
  loading?: boolean;
  error?: unknown;
  isEmpty?: boolean;
  onRetry?: () => void;
  emptyState?: Omit<EmptyStateProps, "className"> | ReactNode;
  loadingVariant?: LoadingVariant;
  loadingRows?: number;
  loadingColumns?: number;
  className?: string;
  children: ReactNode;
}

function isEmptyProps(v: unknown): v is Omit<EmptyStateProps, "className"> {
  return !!v && typeof v === "object" && "title" in (v as Record<string, unknown>);
}

export function AsyncBoundary({
  loading,
  error,
  isEmpty,
  onRetry,
  emptyState,
  loadingVariant = "list",
  loadingRows,
  loadingColumns,
  className,
  children,
}: AsyncBoundaryProps) {
  if (loading) {
    return (
      <LoadingState
        variant={loadingVariant}
        rows={loadingRows}
        columns={loadingColumns}
        className={className}
      />
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} className={className} />;
  }

  if (isEmpty) {
    if (!emptyState) {
      return (
        <EmptyState
          title="Nothing here yet"
          description="There's no data to show in this view."
          className={className}
        />
      );
    }
    return isEmptyProps(emptyState) ? (
      <EmptyState {...emptyState} className={className} />
    ) : (
      <>{emptyState}</>
    );
  }

  return <>{children}</>;
}