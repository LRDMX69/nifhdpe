import { useGsapFadeUp } from "@/hooks/useGsapAnimation";
import { Button } from "@/components/ui/button";
import { HelpCircle, RefreshCw } from "lucide-react";
import { useHelpSheet } from "@/components/HelpSheetProvider";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface BreadcrumbCrumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  description: string;
  children?: React.ReactNode;
  breadcrumbs?: BreadcrumbCrumb[];
  /** Executive one-line insight shown below the description (CEO view). */
  executiveSummary?: string;
  /** Timestamp of the most recent data fetch. When provided, a "Last updated" chip is shown. */
  lastUpdated?: Date | number | null;
  /** Optional refresh callback rendered next to the timestamp. */
  onRefresh?: () => void;
}

const formatRelative = (ts: number): string => {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const PageHeader = ({ title, description, children, breadcrumbs, executiveSummary, lastUpdated, onRefresh }: PageHeaderProps) => {
  const ref = useGsapFadeUp();
  const { open } = useHelpSheet();
  const [, force] = useState(0);
  useEffect(() => {
    if (!lastUpdated) return;
    const id = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [lastUpdated]);
  const ts = lastUpdated instanceof Date ? lastUpdated.getTime() : (lastUpdated ?? null);
  return (
    <div ref={ref} className="relative space-y-3 border-b border-border/70 pb-4 before:absolute before:left-0 before:top-0 before:h-10 before:w-1 before:rounded-full before:bg-primary before:content-['']">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((c, i) => (
              <span key={`${c.label}-${i}`} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {c.to && i < breadcrumbs.length - 1 ? (
                    <BreadcrumbLink asChild>
                      <Link to={c.to}>{c.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{c.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 pl-3">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={open} aria-label="How do I…?">
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">{description}</p>
        {executiveSummary && (
          <p className="mt-2 inline-flex max-w-3xl rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary sm:text-sm">{executiveSummary}</p>
        )}
        {ts && (
          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
            <span>Last updated {formatRelative(ts)}</span>
            {onRefresh && (
              <button type="button" onClick={onRefresh} className="inline-flex items-center gap-1 text-primary hover:underline" aria-label="Refresh data">
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            )}
          </div>
        )}
        </div>
        {children && <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">{children}</div>}
      </div>
    </div>
  );
};
