import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type PageTask = {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

interface PageTaskStartProps {
  title: string;
  description: string;
  tasks: PageTask[];
  className?: string;
}

const taskClassName = "group flex min-w-0 items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50";

export function PageTaskStart({ title, description, tasks, className }: PageTaskStartProps) {
  return (
    <Card className={`border-primary/20 bg-primary/[0.02] ${className ?? ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => {
          const Icon = task.icon;
          const content = (
            <>
              <span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{task.title}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{task.description}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </>
          );

          if (task.href) {
            return <Link key={task.title} to={task.href} className={taskClassName}>{content}</Link>;
          }

          return <button key={task.title} type="button" onClick={task.onClick} disabled={task.disabled} className={taskClassName}>{content}</button>;
        })}
      </CardContent>
    </Card>
  );
}
