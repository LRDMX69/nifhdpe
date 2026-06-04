import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getStatusMeta } from "@/lib/statusCopy";
import { cn } from "@/lib/utils";

/**
 * Drop-in replacement for ad-hoc status pills. Pulls label, colour and
 * tooltip description from the canonical STATUS_COPY map so every
 * module speaks the same language about workflow state.
 */
export function StatusBadge({
  status,
  className,
  overrideLabel,
}: {
  status: string | null | undefined;
  className?: string;
  overrideLabel?: string;
}) {
  const meta = getStatusMeta(status);
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={meta.variant} className={cn("cursor-help", className)}>
            {overrideLabel ?? meta.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs leading-relaxed">{meta.description}</p>
          {meta.responsibleNext && (
            <p className="text-xs leading-relaxed mt-1 text-muted-foreground">Next: {meta.responsibleNext}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}