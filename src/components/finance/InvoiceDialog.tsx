import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/constants";
import type { Database } from "@/integrations/supabase/types";

interface LineItem { description: string; quantity: number; unit_price: number }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

export const InvoiceDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const { user, memberships } = useAuth();
  const { toast } = useToast();
  const orgId = memberships[0]?.organization_id;
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [taxPct, setTaxPct] = useState("7.5");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setClientId(""); setDueDate(""); setNotes(""); setTaxPct("7.5");
      setItems([{ description: "", quantity: 1, unit_price: 0 }]);
    }
  }, [open]);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-invoice", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("clients").select("id, name").eq("organization_id", orgId).order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
    enabled: !!orgId && open,
  });

  const subtotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
  const taxAmount = subtotal * (parseFloat(taxPct) || 0) / 100;
  const total = subtotal + taxAmount;

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const addLine = () => setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  const removeLine = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!orgId || !user) return;
    if (!clientId) { toast({ title: "Pick a client", variant: "destructive" }); return; }
    if (items.some(i => !i.description.trim())) { toast({ title: "Fill all line descriptions", variant: "destructive" }); return; }
    if (subtotal <= 0) { toast({ title: "Invoice total must be greater than zero", variant: "destructive" }); return; }

    setSaving(true);
    try {
      const { data: invoice, error: invErr } = await supabase.from("invoices").insert({
        organization_id: orgId,
        created_by: user.id,
        client_id: clientId,
        invoice_date: new Date().toISOString().slice(0, 10),
        due_date: dueDate || null,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        balance_due: total,
        status: "draft",
        notes: notes || null,
      } as Database["public"]["Tables"]["invoices"]["Insert"]).select().single();
      if (invErr) throw invErr;

      const itemRows = items.map(i => ({
        invoice_id: invoice.id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.quantity * i.unit_price,
      }));
      const { error: itemErr } = await supabase.from("invoice_items").insert(itemRows);
      if (itemErr) throw itemErr;

      toast({ title: "Invoice created", description: `${invoice.document_number ?? "Invoice"} saved successfully.` });
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create invoice";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create New Invoice</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Items *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
              </Button>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-6">
                  <Input placeholder="Description" value={item.description} onChange={e => updateItem(idx, { description: e.target.value })} />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input type="number" min="0" placeholder="Qty" value={item.quantity || ""} onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <Input type="number" min="0" placeholder="Unit price ₦" value={item.unit_price || ""} onChange={e => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeLine(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>VAT / Tax %</Label>
              <Input type="number" min="0" value={taxPct} onChange={e => setTaxPct(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms, bank details, etc." />
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>VAT ({taxPct}%)</span><span>{formatCurrency(taxAmount)}</span></div>
            <div className="flex justify-between font-bold text-base pt-1 border-t border-border/60"><span>Total</span><span className="text-primary">{formatCurrency(total)}</span></div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Invoice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};