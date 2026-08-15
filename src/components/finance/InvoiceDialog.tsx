import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Loader2, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/constants";
import { industrialDb } from "@/lib/industrialDb";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { calculateInvoiceTotals } from "@/lib/financialMath";
import { humanizeError } from "@/lib/humanizeError";

type InvoiceLine = {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  item_type: string;
  product_specification_id: string;
  discount_amount: number;
  tax_amount: number;
  cost_code: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
};

type ClientRow = {
  id: string;
  name: string;
  address?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  tax_identification_number?: string | null;
  state?: string | null;
  local_government?: string | null;
};
type OrderRow = { id: string; order_number: string; client_id: string; project_id: string | null; status: string; total_amount: number | null };
type ProjectRow = { id: string; name: string; client_id: string | null };
type PurchaseOrderRow = { id: string; po_number: string; client_id: string; status: string };
type DeliveryRow = { id: string; document_number?: string | null; delivery_date: string; destination: string; destination_state?: string | null; site_name?: string | null; client_id?: string | null; project_id?: string | null; sales_order_id?: string | null; status: string };
type ProductRow = { id: string; product_code: string; product_name: string; unit?: string | null; is_active?: boolean | null };
type FinanceAccountRow = { id: string; account_name: string; account_number?: string | null };

const emptyLine = (): InvoiceLine => ({ description: "", quantity: 1, unit: "each", unit_price: 0, item_type: "other", product_specification_id: "", discount_amount: 0, tax_amount: 0, cost_code: "" });

export const InvoiceDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const { user, memberships } = useAuth();
  const { toast } = useToast();
  const orgId = memberships[0]?.organization_id;
  const [clientId, setClientId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [clientPoId, setClientPoId] = useState("");
  const [deliveryId, setDeliveryId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [customerReference, setCustomerReference] = useState("");
  const [siteReference, setSiteReference] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryContact, setDeliveryContact] = useState("");
  const [deliveryState, setDeliveryState] = useState("");
  const [deliveryLga, setDeliveryLga] = useState("");
  const [invoiceKind, setInvoiceKind] = useState("standard");
  const [currency, setCurrency] = useState("NGN");
  const [taxPct, setTaxPct] = useState("7.5");
  const [withholdingPct, setWithholdingPct] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [overheadAmount, setOverheadAmount] = useState("0");
  const [transportationCost, setTransportationCost] = useState("0");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [notes, setNotes] = useState("");
  const [freeTradeZone, setFreeTradeZone] = useState(false);
  const [items, setItems] = useState<InvoiceLine[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setClientId(""); setOrderId(""); setProjectId(""); setClientPoId(""); setDeliveryId("");
      setInvoiceDate(new Date().toISOString().slice(0, 10)); setDueDate(""); setCustomerReference(""); setSiteReference("");
      setDeliveryAddress(""); setDeliveryContact(""); setDeliveryState(""); setDeliveryLga(""); setInvoiceKind("standard"); setCurrency("NGN");
      setTaxPct("7.5"); setWithholdingPct("0"); setDiscountAmount("0"); setOverheadAmount("0"); setTransportationCost("0");
      setPaymentTerms(""); setTermsAndConditions(""); setNotes(""); setFreeTradeZone(false); setItems([emptyLine()]);
    }
  }, [open]);

  const { data: orders = [] } = useQuery({
    queryKey: ["orders-for-invoice", orgId],
    queryFn: async () => { if (!orgId) return [] as OrderRow[]; const { data, error } = await industrialDb.from("sales_orders").select("id, order_number, client_id, project_id, status, total_amount").eq("organization_id", orgId).not("status", "eq", "cancelled").order("created_at", { ascending: false }).limit(100); if (error) throw error; return (data ?? []) as OrderRow[]; },
    enabled: !!orgId && open,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-invoice", orgId],
    queryFn: async () => { if (!orgId) return [] as ProjectRow[]; const { data, error } = await industrialDb.from("projects").select("id, name, client_id").eq("organization_id", orgId).order("name"); if (error) throw error; return (data ?? []) as ProjectRow[]; },
    enabled: !!orgId && open,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-invoice", orgId],
    queryFn: async () => { if (!orgId) return [] as ClientRow[]; const { data, error } = await industrialDb.from("clients").select("id, name, address, contact_person, phone, email, tax_identification_number, state, local_government").eq("organization_id", orgId).order("name"); if (error) throw error; return (data ?? []) as ClientRow[]; },
    enabled: !!orgId && open,
  });
  const { data: clientPurchaseOrders = [] } = useQuery({
    queryKey: ["client-pos-for-invoice", orgId],
    queryFn: async () => { if (!orgId) return [] as PurchaseOrderRow[]; const { data, error } = await industrialDb.from("client_purchase_orders").select("id, po_number, client_id, status").eq("organization_id", orgId).not("status", "eq", "rejected").order("created_at", { ascending: false }); if (error) throw error; return (data ?? []) as PurchaseOrderRow[]; },
    enabled: !!orgId && open,
  });
  const { data: deliveries = [] } = useQuery({
    queryKey: ["deliveries-for-invoice", orgId],
    queryFn: async () => { if (!orgId) return [] as DeliveryRow[]; const { data, error } = await industrialDb.from("deliveries").select("id, document_number, delivery_date, destination, destination_state, site_name, client_id, project_id, sales_order_id, status").eq("organization_id", orgId).not("status", "eq", "cancelled").order("delivery_date", { ascending: false }).limit(100); if (error) throw error; return (data ?? []) as DeliveryRow[]; },
    enabled: !!orgId && open,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products-for-invoice", orgId],
    queryFn: async () => { if (!orgId) return [] as ProductRow[]; const { data, error } = await industrialDb.from("product_specifications").select("id, product_code, product_name, unit, is_active").eq("organization_id", orgId).order("product_code"); if (error) throw error; return (data ?? []) as ProductRow[]; },
    enabled: !!orgId && open,
  });
  const { data: financeAccounts = [] } = useQuery({
    queryKey: ["invoice-finance-accounts", orgId],
    queryFn: async () => { if (!orgId) return [] as FinanceAccountRow[]; const { data, error } = await industrialDb.from("finance_accounts").select("id, account_name, account_number").eq("organization_id", orgId).eq("is_active", true).order("account_name"); if (error) throw error; return (data ?? []) as FinanceAccountRow[]; },
    enabled: !!orgId && open,
  });
  const [bankAccountId, setBankAccountId] = useState("");

  const selectedClient = clients.find((client) => client.id === clientId);
  const filteredOrders = orders.filter((order) => !clientId || order.client_id === clientId);
  const filteredProjects = projects.filter((project) => !clientId || !project.client_id || project.client_id === clientId);
  const filteredPos = clientPurchaseOrders.filter((po) => po.client_id === clientId);
  const filteredDeliveries = deliveries.filter((delivery) => !clientId || !delivery.client_id || delivery.client_id === clientId);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unit_price) - Math.max(0, item.discount_amount), 0), [items]);
  const totals = calculateInvoiceTotals({ items: items.map((item) => ({ quantity: item.quantity, unitPrice: item.unit_price, discountAmount: item.discount_amount })), discountAmount: Number(discountAmount) || 0, overheadAmount: Number(overheadAmount) || 0, transportationCost: Number(transportationCost) || 0, taxRatePercent: Number(taxPct) || 0, withholdingTaxRatePercent: Number(withholdingPct) || 0 });

  const updateItem = (index: number, patch: Partial<InvoiceLine>) => setItems((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  const selectClient = (value: string) => { setClientId(value); setOrderId(""); setProjectId(""); setClientPoId(""); setDeliveryId(""); const client = clients.find((candidate) => candidate.id === value); if (client) { setDeliveryAddress(client.address ?? ""); setDeliveryContact(client.contact_person ?? ""); setDeliveryState(client.state ?? ""); setDeliveryLga(client.local_government ?? ""); } };
  const selectOrder = (value: string) => { const order = orders.find((candidate) => candidate.id === value); setOrderId(value === "none" ? "" : value); if (order) { setClientId(order.client_id); setProjectId(order.project_id ?? ""); } };
  const selectProject = (value: string) => { const project = projects.find((candidate) => candidate.id === value); setProjectId(value === "none" ? "" : value); if (project?.client_id) setClientId(project.client_id); };
  const selectDelivery = (value: string) => { const delivery = deliveries.find((candidate) => candidate.id === value); setDeliveryId(value === "none" ? "" : value); if (delivery) { if (delivery.client_id) setClientId(delivery.client_id); if (delivery.project_id) setProjectId(delivery.project_id); setSiteReference(delivery.site_name ?? siteReference); setDeliveryAddress(delivery.destination); setDeliveryState(delivery.destination_state ?? deliveryState); } };

  const handleSubmit = async () => {
    if (!orgId || !user) return;
    if (!clientId) { toast({ title: "Pick a client", description: "Every invoice must belong to a client for numbering and financial history.", variant: "destructive" }); return; }
    if (items.some((item) => !item.description.trim())) { toast({ title: "Fill all line descriptions", variant: "destructive" }); return; }
    if (items.some((item) => item.quantity <= 0 || item.unit_price < 0)) { toast({ title: "Invalid invoice line", description: "Quantity must be greater than zero and price cannot be negative.", variant: "destructive" }); return; }
    if (subtotal <= 0) { toast({ title: "Invoice total must be greater than zero", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const idempotencyKey = `invoice:${orgId}:${user.id}:${Date.now()}`;
      const { data: invoice, error } = await industrialDb.rpc("create_invoice_with_metadata", {
        _org_id: orgId,
        _idempotency_key: idempotencyKey,
        _payload: {
          client_id: clientId, sales_order_id: orderId || null, project_id: projectId || null, client_po_id: clientPoId || null, delivery_id: deliveryId || null,
          invoice_date: invoiceDate, due_date: dueDate || null, customer_reference: customerReference || null, site_reference: siteReference || null,
          delivery_address: deliveryAddress || null, delivery_contact: deliveryContact || null, delivery_state: deliveryState || null, delivery_lga: deliveryLga || null,
          invoice_kind: invoiceKind, currency, tax_rate: Number(taxPct) || 0, withholding_tax_rate: Number(withholdingPct) || 0, discount_amount: Number(discountAmount) || 0,
          overhead_amount: Number(overheadAmount) || 0, transportation_cost: Number(transportationCost) || 0, free_trade_zone: freeTradeZone, bank_account_id: bankAccountId || null,
          payment_terms: paymentTerms || null, terms_and_conditions: termsAndConditions || null, notes: notes || null,
          source_metadata: { source: orderId ? "sales_order" : "manual", created_from: "finance_invoice_dialog", selected_account_id: bankAccountId || null },
          items: items.map((item) => ({ ...item, product_specification_id: item.product_specification_id || null, cost_code: item.cost_code || null })),
        },
      });
      if (error) throw error;
      toast({ title: "Invoice created", description: `${(invoice as { document_number?: string } | null)?.document_number ?? "Invoice"} saved with client-linked numbering and complete source metadata.` });
      onOpenChange(false); onCreated?.();
    } catch (error) {
      toast({ title: "Could not create invoice", description: humanizeError(error), variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92dvh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Create complete invoice</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <section className="space-y-3"><div><h3 className="text-sm font-semibold">Customer and source lineage</h3><p className="text-xs text-muted-foreground">The client ID drives numbering, snapshots, client history, payment tracking, and reporting.</p></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1.5 lg:col-span-2"><Label>Client *</Label><Select value={clientId} onValueChange={selectClient}><SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}{client.tax_identification_number ? ` · TIN ${client.tax_identification_number}` : ""}</SelectItem>)}</SelectContent></Select>{selectedClient && <p className="text-[11px] text-muted-foreground">{selectedClient.address ?? "No address"} · {selectedClient.phone ?? "No phone"}</p>}</div>
            <div className="space-y-1.5"><Label>Invoice kind</Label><Select value={invoiceKind} onValueChange={setInvoiceKind}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="standard">Standard invoice</SelectItem><SelectItem value="credit_note">Credit note</SelectItem><SelectItem value="debit_note">Debit note</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Sales order</Label><Select value={orderId || "none"} onValueChange={selectOrder}><SelectTrigger><SelectValue placeholder="Optional source order" /></SelectTrigger><SelectContent><SelectItem value="none">Manual / no order</SelectItem>{filteredOrders.map((order) => <SelectItem key={order.id} value={order.id}>{order.order_number} · {order.status} · {formatCurrency(Number(order.total_amount ?? 0))}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Client purchase order</Label><Select value={clientPoId || "none"} onValueChange={(value) => setClientPoId(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="Optional client PO" /></SelectTrigger><SelectContent><SelectItem value="none">No client PO</SelectItem>{filteredPos.map((po) => <SelectItem key={po.id} value={po.id}>{po.po_number} · {po.status}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Project</Label><Select value={projectId || "none"} onValueChange={selectProject}><SelectTrigger><SelectValue placeholder="Optional project" /></SelectTrigger><SelectContent><SelectItem value="none">No project</SelectItem>{filteredProjects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Linked delivery / waybill</Label><Select value={deliveryId || "none"} onValueChange={selectDelivery}><SelectTrigger><SelectValue placeholder="Optional delivery" /></SelectTrigger><SelectContent><SelectItem value="none">No delivery yet</SelectItem>{filteredDeliveries.map((delivery) => <SelectItem key={delivery.id} value={delivery.id}>{delivery.document_number ?? "Delivery"} · {delivery.destination} · {delivery.status}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Customer reference</Label><Input value={customerReference} onChange={(e) => setCustomerReference(e.target.value)} placeholder="Client reference / contract" /></div>
            <div className="space-y-1.5"><Label>Invoice date *</Label><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div></section>

          <section className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">Invoice lines</h3><p className="text-xs text-muted-foreground">Use approved product specifications where available; the database recalculates totals atomically.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setItems((current) => [...current, emptyLine()])}><Plus className="h-3.5 w-3.5 mr-1" />Add line</Button></div>{items.map((item, index) => <div key={index} className="grid grid-cols-12 gap-2 items-end rounded-lg border p-3"><div className="col-span-12 lg:col-span-4 space-y-1.5"><Label>Description *</Label><Input value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} placeholder="HDPE pipe / service / charge" /><Select value={item.product_specification_id || "none"} onValueChange={(value) => { const product = products.find((candidate) => candidate.id === value); updateItem(index, { product_specification_id: value === "none" ? "" : value, unit: product?.unit ?? item.unit, description: item.description || (product ? `${product.product_code} — ${product.product_name}` : item.description) }); }}><SelectTrigger><SelectValue placeholder="Optional product specification" /></SelectTrigger><SelectContent><SelectItem value="none">Unlinked line</SelectItem>{products.filter((product) => product.is_active !== false).map((product) => <SelectItem key={product.id} value={product.id}>{product.product_code} · {product.product_name}</SelectItem>)}</SelectContent></Select></div><div className="col-span-4 lg:col-span-1 space-y-1.5"><Label>Qty</Label><Input type="number" min="0" step="0.01" value={item.quantity || ""} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })} /></div><div className="col-span-4 lg:col-span-1 space-y-1.5"><Label>Unit</Label><Input value={item.unit} onChange={(e) => updateItem(index, { unit: e.target.value })} /></div><div className="col-span-4 lg:col-span-2 space-y-1.5"><Label>Unit price</Label><Input type="number" min="0" step="0.01" value={item.unit_price || ""} onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) || 0 })} /></div><div className="col-span-5 lg:col-span-2 space-y-1.5"><Label>Line discount</Label><Input type="number" min="0" step="0.01" value={item.discount_amount || ""} onChange={(e) => updateItem(index, { discount_amount: Number(e.target.value) || 0 })} /></div><div className="col-span-5 lg:col-span-1 space-y-1.5"><Label>Cost code</Label><Input value={item.cost_code} onChange={(e) => updateItem(index, { cost_code: e.target.value })} /></div><div className="col-span-2 lg:col-span-1 flex justify-end">{items.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => setItems((current) => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div></div>)}</section>

          <section className="space-y-3"><h3 className="text-sm font-semibold">Delivery and tax context</h3><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"><div className="space-y-1.5"><Label>Site reference</Label><Input value={siteReference} onChange={(e) => setSiteReference(e.target.value)} /></div><div className="space-y-1.5"><Label>Delivery state</Label><Input value={deliveryState} onChange={(e) => setDeliveryState(e.target.value)} /></div><div className="space-y-1.5"><Label>Delivery LGA</Label><Input value={deliveryLga} onChange={(e) => setDeliveryLga(e.target.value)} /></div><div className="space-y-1.5"><Label>Delivery contact</Label><Input value={deliveryContact} onChange={(e) => setDeliveryContact(e.target.value)} /></div><div className="space-y-1.5 sm:col-span-2 lg:col-span-4"><Label>Delivery address</Label><Textarea rows={2} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} /></div><div className="space-y-1.5"><Label>VAT / tax rate (%)</Label><Input type="number" min="0" step="0.01" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} /></div><div className="space-y-1.5"><Label>WHT rate (%)</Label><Input type="number" min="0" step="0.01" value={withholdingPct} onChange={(e) => setWithholdingPct(e.target.value)} /></div><div className="space-y-1.5"><Label>Discount total</Label><Input type="number" min="0" step="0.01" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} /></div><div className="space-y-1.5"><Label>Overhead / site cost</Label><Input type="number" min="0" step="0.01" value={overheadAmount} onChange={(e) => setOverheadAmount(e.target.value)} /></div><div className="space-y-1.5"><Label>Transportation / haulage</Label><Input type="number" min="0" step="0.01" value={transportationCost} onChange={(e) => setTransportationCost(e.target.value)} /></div><div className="space-y-1.5"><Label>Currency</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} /></div><div className="flex items-center gap-2 pt-6"><Checkbox id="invoice-ftz" checked={freeTradeZone} onCheckedChange={(checked) => setFreeTradeZone(checked === true)} /><Label htmlFor="invoice-ftz">Free Trade Zone</Label></div></div></section>

          <section className="space-y-3"><h3 className="text-sm font-semibold">Payment and account context</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-1.5"><Label>Receiving account</Label><Select value={bankAccountId || "none"} onValueChange={(value) => setBankAccountId(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="Optional account" /></SelectTrigger><SelectContent><SelectItem value="none">Assign during payment</SelectItem>{financeAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.account_name}{account.account_number ? ` · ${account.account_number}` : ""}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Payment terms</Label><Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. 30 days from invoice" /></div><div className="space-y-1.5 sm:col-span-2"><Label>Terms and conditions</Label><Textarea rows={3} value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} placeholder="Delivery, warranty, acceptance, retention, and other approved terms" /></div><div className="space-y-1.5 sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div></div></section>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-1 text-sm"><div className="flex justify-between"><span>Line subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div><div className="flex justify-between text-muted-foreground"><span>Discount</span><span>-{formatCurrency(totals.discount)}</span></div><div className="flex justify-between text-muted-foreground"><span>Taxable amount</span><span>{formatCurrency(totals.taxableAmount)}</span></div><div className="flex justify-between text-muted-foreground"><span>VAT / tax ({taxPct}%)</span><span>{formatCurrency(totals.taxAmount)}</span></div><div className="flex justify-between text-muted-foreground"><span>WHT ({withholdingPct}%)</span><span>-{formatCurrency(totals.withholdingTaxAmount)}</span></div><div className="flex justify-between font-bold text-base pt-1 border-t border-border/60"><span>Gross total / net due</span><span className="text-primary">{formatCurrency(totals.totalAmount)} / {formatCurrency(totals.netAmount)}</span></div></div>
          <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create invoice atomically</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
