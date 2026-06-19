import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Command as CommandIcon, PlayCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { startTour } from "@/components/GuidedTour";
import { getRoleTour } from "@/lib/tours";

interface Entry {
  q: string;
  a: string;
  action?: { label: string; path: string };
  tags?: string[];
}

const ENTRIES: Entry[] = [
  { q: "How do I create an invoice?",        a: "Open Finance → Invoices tab → click the green + New Invoice button at the top right. You can also press ⌘K and search 'invoice'.", action: { label: "Open Invoices", path: "/finance?tab=invoices" }, tags: ["invoice","bill","charge","client"] },
  { q: "How do I record a payment from a client?", a: "Open Finance → Invoices → click the row action menu on any invoice → Record Payment. A numbered receipt PDF is issued automatically.", action: { label: "Open Invoices", path: "/finance?tab=invoices" }, tags: ["payment","receipt","paid","cash"] },
  { q: "How do I create a waybill for the driver?", a: "Open Logistics → click + New Waybill at the top. Add destination, driver, vehicle and items — a printable waybill PDF is generated for the trip.", action: { label: "Open Logistics", path: "/logistics" }, tags: ["waybill","driver","police","checkpoint","dispatch"] },
  { q: "How do I create a quotation?",       a: "Open Quotations → + New Quotation. Add line items (pipes/fittings), labor, transport, profit %. Once accepted, you can convert it directly into an invoice.", action: { label: "Open Quotations", path: "/quotations" }, tags: ["quote","quotation","estimate","price"] },
  { q: "How do I convert a quotation into an invoice?", a: "On any quotation row → row menu → Convert to Invoice. The invoice is pre-filled with the quotation totals.", action: { label: "Open Quotations", path: "/quotations" }, tags: ["convert","invoice","quotation"] },
  { q: "How do I submit a worker claim?",    a: "Open Claims → + New Claim. Always attach the receipt/photo proof — claims without proof get auto-rejected.", action: { label: "Open Claims", path: "/claims" }, tags: ["claim","reimburse","expense","voucher"] },
  { q: "How do I check in / check out for attendance?", a: "On the Dashboard, use the Check-In widget. Check-out is enabled strictly after 5:00 PM. You must be inside one of the registered office zones.", action: { label: "Open Dashboard", path: "/dashboard" }, tags: ["attendance","clock","present","time"] },
  { q: "How do I generate an employee ID card?", a: "HR → ID Cards tab → select employee → Generate ID Card.", action: { label: "Open HR", path: "/hr" }, tags: ["id","card","employee"] },
  { q: "How do I submit a field report?",    a: "Field Reports → + New Report. Add photos and crew members; GPS tagging happens automatically.", action: { label: "Open Field Reports", path: "/field-reports" }, tags: ["report","field","site"] },
  { q: "How do I request equipment?",        a: "Equipment → choose item → Request. Admin gets notified instantly.", action: { label: "Open Equipment", path: "/equipment" }, tags: ["equipment","tool","request"] },
  { q: "How do I add a new client?",         a: "Clients → + Add Client. Stored centrally so quotations & invoices auto-fill.", action: { label: "Open Clients", path: "/clients" }, tags: ["client","customer","contact"] },
  { q: "How do I find a stored pipe quickly?", a: "Inventory → use Quick Find at the top — search by item and the rack/zone shows immediately.", action: { label: "Open Inventory", path: "/inventory" }, tags: ["inventory","find","location","rack"] },
  { q: "How do I see every document we have issued?", a: "Settings → Document Registry — a searchable list of every invoice, quotation, receipt, waybill, PO etc. with their reference numbers.", action: { label: "Open Document Registry", path: "/documents" }, tags: ["registry","number","reference","history"] },
  { q: "How do I quickly jump anywhere in the app?", a: "Press ⌘K (Mac) or Ctrl+K (Windows) anywhere — search a page name or action and hit Enter.", tags: ["search","command","palette","shortcut"] },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const HelpSheet = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { activeRole, isMaintenance } = useAuth();
  const role = activeRole ?? (isMaintenance ? "administrator" : undefined);
  const tour = role ? getRoleTour(role) : undefined;

  useEffect(() => { if (!open) setQ(""); }, [open]);

  const matches = ENTRIES.filter(e => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return e.q.toLowerCase().includes(needle) || e.a.toLowerCase().includes(needle) || (e.tags ?? []).some(t => t.includes(needle));
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-2">
          <SheetTitle>How do I…?</SheetTitle>
          <SheetDescription className="text-xs flex items-center gap-2">
            <CommandIcon className="h-3 w-3" /> Tip: press <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd> anywhere to jump.
          </SheetDescription>
        </SheetHeader>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search e.g. invoice, waybill, claim…" className="pl-9" value={q} onChange={e => setQ(e.target.value)} />
        </div>

        {tour && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full justify-start gap-2"
            onClick={() => { onOpenChange(false); startTour(role!); }}
          >
            <PlayCircle className="h-4 w-4 text-primary" />
            Replay {tour.label}
          </Button>
        )}

        <div className="mt-4 space-y-3 pb-8">
          {matches.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nothing matched. Try another keyword.</p>}
          {matches.map((e) => (
            <div key={e.q} className="rounded-lg border border-border/60 bg-card p-3 space-y-2">
              <p className="font-medium text-sm">{e.q}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{e.a}</p>
              {e.action && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { navigate(e.action!.path); onOpenChange(false); }}>
                  {e.action.label} <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};