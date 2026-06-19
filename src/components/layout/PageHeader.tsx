import { useGsapFadeUp } from "@/hooks/useGsapAnimation";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { useHelpSheet } from "@/components/HelpSheetProvider";
import { Link } from "react-router-dom";
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
}

export const PageHeader = ({ title, description, children, breadcrumbs }: PageHeaderProps) => {
  const ref = useGsapFadeUp();
  const { open } = useHelpSheet();
  return (
    <div ref={ref} className="space-y-2">
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
        <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold">{title}</h1>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={open} aria-label="How do I…?">
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
};
