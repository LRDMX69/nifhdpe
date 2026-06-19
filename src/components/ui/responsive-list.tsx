import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/**
 * ResponsiveList — render the same record set as a dense table on
 * desktop (md+) and as touch-friendly stacked cards on mobile.
 *
 *   <ResponsiveList
 *     items={rows}
 *     getKey={(r) => r.id}
 *     columns={[
 *       { header: "Name",   cell: (r) => r.name,   primary: true },
 *       { header: "Status", cell: (r) => r.status },
 *     ]}
 *     renderActions={(r) => <RowActions row={r} />}
 *   />
 */
export type ResponsiveColumn<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  /** On mobile this column becomes the card title. */
  primary?: boolean;
  /** Hide this column on mobile cards (still shown on desktop table). */
  hideOnMobile?: boolean;
  className?: string;
};

export function ResponsiveList<T>({
  items,
  columns,
  getKey,
  renderActions,
  onRowClick,
  emptyState,
  className,
}: {
  items: T[];
  columns: ResponsiveColumn<T>[];
  getKey: (row: T) => string;
  renderActions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
}) {
  if (!items.length && emptyState) return <>{emptyState}</>;

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-2">
        {items.map((row) => {
          const primary = columns.find((c) => c.primary) ?? columns[0];
          const rest = columns.filter((c) => c !== primary && !c.hideOnMobile);
          return (
            <Card
              key={getKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "p-3 space-y-2",
                onRowClick && "cursor-pointer active:scale-[0.99] transition-transform",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium text-sm leading-tight">{primary.cell(row)}</div>
                {renderActions && (
                  <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                    {renderActions(row)}
                  </div>
                )}
              </div>
              {rest.length > 0 && (
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {rest.map((c) => (
                    <div key={c.header} className="flex flex-col">
                      <dt className="text-muted-foreground">{c.header}</dt>
                      <dd className="text-foreground">{c.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>
          );
        })}
      </div>

      {/* Desktop: real table */}
      <div className="hidden md:block relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b">
              {columns.map((c) => (
                <th
                  key={c.header}
                  className={cn(
                    "h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap",
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
              {renderActions && <th className="h-12 px-4 w-px" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr
                key={getKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b transition-colors hover:bg-muted/50",
                  onRowClick && "cursor-pointer",
                )}
              >
                {columns.map((c) => (
                  <td key={c.header} className={cn("p-4 align-middle", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
                {renderActions && (
                  <td
                    className="p-4 align-middle text-right w-px"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {renderActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}