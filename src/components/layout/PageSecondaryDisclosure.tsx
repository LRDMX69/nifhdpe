import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PageSecondaryDisclosureProps {
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function PageSecondaryDisclosure({ title, description, children, defaultOpen = false }: PageSecondaryDisclosureProps) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="space-y-3">
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="shrink-0">View details<ChevronDown className="ml-1 h-3.5 w-3.5" /></Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
