import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { generateWaybill } from "@/lib/generateWaybill";

interface Line { description: string; quantity: string; unit: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * Standalone Waybill creator — works without a linked delivery so dispatch
 * can issue a checkpoint slip for any movement of materials.
 */
export const WaybillDialog = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [driver, setDriver] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [destination, setDestination] = useState("");
  const [destState, setDestState] = useState("");
  const [siteName, setSiteName] = useState("");
  const [project, setProject] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: "", unit: "pcs" }]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setDate(new Date().toISOString().slice(0, 10));
      setDriver(""); setVehicle(""); setDestination(""); setDestState("");
      setSiteName(""); setProject(""); setNotes("");
      setLines([{ description: "", quantity: "", unit: "pcs" }]);
    }
  }, [open]);

  const update = (i: number, p: Partial<Line>) => setLines(lines.map((l, idx) => idx === i ? { ...l, ...p } : l));
  const addLine = () => setLines([...lines, { description: "", quantity: "", unit: "pcs" }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!destination.trim()) { toast({ title: "Destination is required", variant: "destructive" }); return; }
    if (!driver.trim()) { toast({ title: "Driver name is required", variant: "destructive" }); return; }
    const items = lines.filter(l => l.description.trim()).map(l => ({
      description: l.description.trim(),
      quantity: l.quantity || "—",
      unit: l.unit,
    }));
    if (items.length === 0) { toast({ title: "Add at least one item", variant: "destructive" }); return; }
    setBusy(true);
    try {
      await generateWaybill({
        date, driver, vehicle, destination,
        destinationState: destState || null,
        siteName: siteName || null,
        projectName: project || null,
        notes: notes || null,
        items,
        issuedBy: user?.email ?? undefined,
      });
      toast({ title: "Waybill generated", description: "Hand the printed copy to the driver." });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Waybill failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />New Waybill</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Driver *</Label><Input placeholder="Driver full name" value={driver} onChange={e => setDriver(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Vehicle</Label><Input placeholder="Plate number / make" value={vehicle} onChange={e => setVehicle(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Destination State</Label><Input placeholder="e.g. Rivers" value={destState} onChange={e => setDestState(e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Destination *</Label><Input placeholder="Full address" value={destination} onChange={e => setDestination(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Site / Recipient</Label><Input value={siteName} onChange={e => setSiteName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Project</Label><Input value={project} onChange={e => setProject(e.target.value)} /></div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items being conveyed *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-7"><Input placeholder="Description (e.g. 110mm HDPE pipe x 6m)" value={l.description} onChange={e => update(i, { description: e.target.value })} /></div>
                <div className="col-span-5 sm:col-span-2"><Input placeholder="Qty" value={l.quantity} onChange={e => update(i, { quantity: e.target.value })} /></div>
                <div className="col-span-5 sm:col-span-2"><Input placeholder="Unit" value={l.unit} onChange={e => update(i, { unit: e.target.value })} /></div>
                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  {lines.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeLine(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special handling instructions, checkpoint info, etc." /></div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Waybill PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};