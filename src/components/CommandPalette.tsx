import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import {
  LayoutDashboard, FileText, Users, Package, FolderKanban, Calculator, Truck,
  DollarSign, Wrench, ShieldCheck, BookOpen, Target, UserCog, AlertCircle,
  MessageSquare, ShoppingCart, BarChart3, Settings, Plus, Receipt, ClipboardList,
} from "lucide-react";

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(v => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (path: string) => { setOpen(false); navigate(path); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search actions or pages… (⌘K)" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Create">
          <CommandItem onSelect={() => go("/finance?tab=invoices&new=1")}><Receipt className="h-4 w-4 mr-2" />New Invoice</CommandItem>
          <CommandItem onSelect={() => go("/quotations?new=1")}><FileText className="h-4 w-4 mr-2" />New Quotation</CommandItem>
          <CommandItem onSelect={() => go("/clients?new=1")}><Users className="h-4 w-4 mr-2" />New Client</CommandItem>
          <CommandItem onSelect={() => go("/field-reports?new=1")}><ClipboardList className="h-4 w-4 mr-2" />Submit Field Report</CommandItem>
          <CommandItem onSelect={() => go("/claims?new=1")}><AlertCircle className="h-4 w-4 mr-2" />New Worker Claim</CommandItem>
          <CommandItem onSelect={() => go("/projects?new=1")}><FolderKanban className="h-4 w-4 mr-2" />New Project</CommandItem>
          <CommandItem onSelect={() => go("/inventory?new=1")}><Package className="h-4 w-4 mr-2" />Add Inventory Item</CommandItem>
          <CommandItem onSelect={() => go("/equipment?new=1")}><Wrench className="h-4 w-4 mr-2" />Request Equipment</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Go to">
          <CommandItem onSelect={() => go("/dashboard")}><LayoutDashboard className="h-4 w-4 mr-2" />Dashboard</CommandItem>
          <CommandItem onSelect={() => go("/finance")}><DollarSign className="h-4 w-4 mr-2" />Finance</CommandItem>
          <CommandItem onSelect={() => go("/finance?tab=invoices")}><Receipt className="h-4 w-4 mr-2" />Invoices</CommandItem>
          <CommandItem onSelect={() => go("/quotations")}><FileText className="h-4 w-4 mr-2" />Quotations</CommandItem>
          <CommandItem onSelect={() => go("/clients")}><Users className="h-4 w-4 mr-2" />Clients</CommandItem>
          <CommandItem onSelect={() => go("/projects")}><FolderKanban className="h-4 w-4 mr-2" />Projects</CommandItem>
          <CommandItem onSelect={() => go("/inventory")}><Package className="h-4 w-4 mr-2" />Inventory</CommandItem>
          <CommandItem onSelect={() => go("/logistics")}><Truck className="h-4 w-4 mr-2" />Logistics</CommandItem>
          <CommandItem onSelect={() => go("/equipment")}><Wrench className="h-4 w-4 mr-2" />Equipment</CommandItem>
          <CommandItem onSelect={() => go("/field-reports")}><ClipboardList className="h-4 w-4 mr-2" />Field Reports</CommandItem>
          <CommandItem onSelect={() => go("/claims")}><AlertCircle className="h-4 w-4 mr-2" />Worker Claims</CommandItem>
          <CommandItem onSelect={() => go("/opportunities")}><Target className="h-4 w-4 mr-2" />Opportunities</CommandItem>
          <CommandItem onSelect={() => go("/procurement")}><ShoppingCart className="h-4 w-4 mr-2" />Procurement</CommandItem>
          <CommandItem onSelect={() => go("/hse")}><ShieldCheck className="h-4 w-4 mr-2" />HSE</CommandItem>
          <CommandItem onSelect={() => go("/compliance")}><ShieldCheck className="h-4 w-4 mr-2" />Compliance</CommandItem>
          <CommandItem onSelect={() => go("/hr")}><UserCog className="h-4 w-4 mr-2" />HR</CommandItem>
          <CommandItem onSelect={() => go("/analytics")}><BarChart3 className="h-4 w-4 mr-2" />Analytics</CommandItem>
          <CommandItem onSelect={() => go("/calculator")}><Calculator className="h-4 w-4 mr-2" />Pipe Calculator</CommandItem>
          <CommandItem onSelect={() => go("/knowledge-base")}><BookOpen className="h-4 w-4 mr-2" />Knowledge Base</CommandItem>
          <CommandItem onSelect={() => go("/messages")}><MessageSquare className="h-4 w-4 mr-2" />Messages</CommandItem>
          <CommandItem onSelect={() => go("/settings")}><Settings className="h-4 w-4 mr-2" />Settings</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};