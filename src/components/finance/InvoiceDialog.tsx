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
import { industrialDb } from "@/lib/industrialDb";
import type { Database } from "@/integrations/supabase/types";

interface LineItem { description: string; quantity: number; unit_price: number; item_type: string }

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
  const [orderId, setOrderId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [taxPct, setTaxPct] = useState("7.5");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [overheadAmount, setOverheadAmount] = useState("0");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unit_price: 0, item_type: "other" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setClientId(""); setOrderId(""); setProjectId(""); setDueDate(""); setNotes(""); setPaymentTerms(""); setTermsAndConditions(""); setTaxPct("7.5"); setDiscountAmount("0"); setOverheadAmount("0");
      setItems([{ description: "", quantity: 1, unit_price: 0, item_type: "other" }]);
    }
  }, [open]);

  const { data: orders = [] } = useQuery({
    queryKey: ["orders-for-invoice", orgId],
    queryFn: async () => { if (!orgId) return []; const { data } = await industrialDb.from("sales_orders").select("id, order_number, client_id, project_id, status, total_amount").eq("organization_id", orgId).not("status", "eq", "cancelled").order("created_at", { ascending: false }).limit(100); return (data ?? []) as unknown as { id: string; order_number: string; client_id: string | null; project_id: string | null; status: string; total_amount: number | null }[]; },
    enabled: !!orgId && open,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-invoice", orgId],
    queryFn: async () => { if (!orgId) return []; const { data } = await industrialDb.from("projects").select("id, name, client_id").eq("organization_id", orgId).order("name"); return (data ?? []) as unknown as { id: string; name: string; client_id: string | null }[]; },
    enabled: !!orgId && open,
  });

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
  const discount = Math.min(subtotal, Math.max(0, parseFloat(discountAmount) || 0));
  const overhead = Math.max(0, parseFloat(overheadAmount) || 0);
  const taxableSubtotal = Math.max(0, subtotal - discount);
  const taxAmount = taxableSubtotal * (parseFloat(taxPct) || 0) / 100;
  const total = taxableSubtotal + overhead + taxAmount;

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const addLine = () => setItems([...items, { description: "", quantity: 1, unit_price: 0, item_type: "other" }]);
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
        sales_order_id: orderId || null,
        project_id: projectId || null,
        invoice_date: new Date().toISOString().slice(0, 10),
        due_date: dueDate || null,
        subtotal,
        discount_amount: discount,
        overhead_amount: overhead,
        tax_rate: parseFloat(taxPct) || 0,
        tax_amount: taxAmount,
        total_amount: total,
        balance_due: total,
        status: "draft",
        payment_terms: paymentTerms || null,
        terms_and_conditions: termsAndConditions || null,
        notes: notes || null,
      } as Database["public"]["Tables"]["invoices"]["Insert"]).select().single();
      if (invErr) throw invErr;

      const itemRows = items.map(i => ({
        invoice_id: invoice.id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.quantity * i.unit_price,
        item_type: i.item_type,
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
            <div className="space-y-1.5">
              <Label>Sales Order</Label>
              <Select value={orderId || "none"} onValueChange={(value) => { const order = orders.find((o) => o.id === value); setOrderId(value === "none" ? "" : value); if (order?.client_id) setClientId(order.client_id); if (order?.project_id) setProjectId(order.project_id); }}><SelectTrigger><SelectValue placeholder="Optional source order" /></SelectTrigger><SelectContent><SelectItem value="none">Manual / no order</SelectItem>{orders.map((order) => <SelectItem key={order.id} value={order.id}>{order.order_number} · {order.status}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select value={projectId || "none"} onValueChange={(value) => { const project = projects.find((p) => p.id === value); setProjectId(value === "none" ? "" : value); if (project?.client_id) setClientId(project.client_id); }}><SelectTrigger><SelectValue placeholder="Optional project" /></SelectTrigger><SelectContent><SelectItem value="none">No project link</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select>
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
                <div className="col-span-6 sm:col-span-2"><Select value={item.item_type} onValueChange={(value) => updateItem(idx, { item_type: value })}><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="pipe">Pipe</SelectItem><SelectItem value="fitting">Fitting</SelectItem><SelectItem value="labor">Labor</SelectItem><SelectItem value="transport">Transport</SelectItem><SelectItem value="equipment">Equipment</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
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
            <div className="space-y-1.5"><Label>Discount (₦)</Label><Input type="number" min="0" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Overhead / site cost (₦)</Label><Input type="number" min="0" value={overheadAmount} onChange={e => setOverheadAmount(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>VAT / Tax %</Label><Input type="number" min="0" value={taxPct} onChange={e => setTaxPct(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Payment Terms</Label><Input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="e.g. 30 days from invoice" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Terms and Conditions</Label><Textarea rows={2} value={termsAndConditions} onChange={e => setTermsAndConditions(e.target.value)} placeholder="Delivery, warranty, exclusions, and acceptance terms" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal or client-facing notes" /></div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>-{formatCurrency(discount)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Overhead / site cost</span><span>{formatCurrency(overhead)}</span></div>
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