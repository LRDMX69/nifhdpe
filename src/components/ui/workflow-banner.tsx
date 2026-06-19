import { ReactNode, useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Collapsible "How this works" banner shown at the top of major
 * pages and workflows. Explains the responsibility chain so users
 * never have to ask the administrator how a process flows.
 */
export interface WorkflowStep {
  actor: string;
  action: string;
}

export interface WorkflowBannerProps {
  title?: string;
  summary: ReactNode;
  steps?: WorkflowStep[];
  tone?: "info" | "warning" | "success";
  defaultOpen?: boolean;
  storageKey?: string;
  className?: string;
}

export function WorkflowBanner({
  title = "How this works",
  summary,
  steps,
  tone = "info",
  defaultOpen = false,
  storageKey,
  className,
}: WorkflowBannerProps) {
  const initial = (() => {
    if (typeof window === "undefined" || !storageKey) return defaultOpen;
    try {
      const stored = window.localStorage.getItem(`wf_banner_${storageKey}`);
      if (stored === "open") return true;
      if (stored === "closed") return false;
    } catch { /* storage unavailable */ }
    return defaultOpen;
  })();
  const [open, setOpen] = useState(initial);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (storageKey && typeof window !== "undefined") {
      try { window.localStorage.setItem(`wf_banner_${storageKey}`, next ? "open" : "closed"); } catch { /* storage unavailable */ }
    }
  };

  const toneClasses =
    tone === "warning"
      ? "border-warning/40 bg-warning/5"
      : tone === "success"
        ? "border-success/40 bg-success/5"
        : "border-primary/30 bg-primary/5";

  return (
    <div className={cn("rounded-lg border", toneClasses, className)}>
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground truncate">{title}</span>
          {!open && (
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">— {typeof summary === "string" ? summary : "tap to expand"}</span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
          {steps && steps.length > 0 && (
            <ol className="space-y-1.5">
              {steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-semibold">
                    {idx + 1}
                  </span>
                  <span className="text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">{step.actor}</span>{" — "}
                    {step.action}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}