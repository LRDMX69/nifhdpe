import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

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

const taskClassName = "group flex min-w-0 items-center gap-2.5 rounded-md border border-border/60 bg-background/60 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50";

export function PageTaskStart({ title, description, tasks, className }: PageTaskStartProps) {
  return (
    <section className={`space-y-3 border-b border-border/60 pb-4 ${className ?? ""}`} aria-labelledby={`${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-heading`}>
      <div className="min-w-0 pl-1">
        <h2 id={`${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-heading`} className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => {
          const Icon = task.icon;
          const content = (
            <>
              <span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{task.title}</span>
                <span className="mt-0.5 block line-clamp-2 text-xs leading-4 text-muted-foreground">{task.description}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </>
          );

          if (task.href) {
            return <Link key={task.title} to={task.href} className={taskClassName}>{content}</Link>;
          }

          return <button key={task.title} type="button" onClick={task.onClick} disabled={task.disabled} className={taskClassName}>{content}</button>;
        })}
      </div>
    </section>
  );
}
