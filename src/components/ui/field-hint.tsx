import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Inline helper text rendered directly under a form field. Use this
 * instead of a tooltip when the hint applies on every visit (required
 * format, who sees the value, downstream effects).
 */
export function FieldHint({ children, tone = "muted", className }: {
  children: ReactNode;
  tone?: "muted" | "warning" | "success";
  className?: string;
}) {
  const toneClass =
    tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-muted-foreground";
  return <p className={cn("text-xs leading-relaxed mt-1", toneClass, className)}>{children}</p>;
}