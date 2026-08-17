import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkflowBanner } from "@/components/ui/workflow-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { AsyncBoundary } from "@/components/ui/async-boundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, ShoppingCart, PackageCheck, ClipboardList, Search, Filter, Loader2, Phone, Mail, MapPin, FileDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { humanizeError } from "@/lib/humanizeError";
import { isFinanceCapable } from "@/lib/constants";
import { industrialDb } from "@/lib/industrialDb";

type VendorRow = Database["public"]["Tables"]["vendors"]["Row"];
type PoRow = Database["public"]["Tables"]["purchase_orders"]["Row"] & { vendors?: { name: string } | null };
type MrRow = Database["public"]["Tables"]["material_requisitions"]["Row"];
type PoItemRow = Database["public"]["Tables"]["purchase_order_items"]["Row"];
type GrnRow = Database["public"]["Tables"]["goods_received_notes"]["Row"] & {
  vendors?: { name: string } | null;
  purchase_orders?: { document_number: string | null } | null;
  grn_items?: Array<{ item_name: string; quantity_received: number }>;
};
type DraftPoItem = { id: string; itemName: string; description: string; quantity: string; unit: string; unitPrice: string };
type DraftMrItem = { id: string; itemName: string; quantity: string; unit: string; inventoryId: string };
type GrnDraftItem = { id: string; itemName: string; remaining: number; accepted: string; rejected: string; lotBatch: string };

const Procurement = () => {
  const { user, activeRole, memberships } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = memberships[0]?.organization_id;
  const isAdmin = activeRole === "administrator";
  const isFinance = isFinanceCapable(activeRole);
  const isWarehouse = activeRole === "warehouse";

  const [vendorOpen, setVendorOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [grnOpen, setGrnOpen] = useState(false);
  const [mrOpen, setMrOpen] = useState(false);

  const [newVendor, setNewVendor] = useState({ name: "", email: "", phone: "", address: "", category: "" });
  
  // PO state
  const [poVendorId, setPoVendorId] = useState("");
  const [poMode, setPoMode] = useState("local");
  const [poVendorInvoice, setPoVendorInvoice] = useState("");
  const [poFolio, setPoFolio] = useState("");
  const [poSiteReference, setPoSiteReference] = useState("");
  const [poVat, setPoVat] = useState("");
  const [poHaulage, setPoHaulage] = useState("");
  const [poExchangeRate, setPoExchangeRate] = useState("");
  const [poAmountPaid, setPoAmountPaid] = useState("");
  const [poItems, setPoItems] = useState<DraftPoItem[]>([{ id: "po-item-1", itemName: "", description: "", quantity: "1", unit: "", unitPrice: "0" }]);
  
  // GRN state
  const [grnPoId, setGrnPoId] = useState("");
  const [grnLineItems, setGrnLineItems] = useState<GrnDraftItem[]>([]);
  
  // MR state
  const [mrProjectId, setMrProjectId] = useState("");
  const [mrRequiredDate, setMrRequiredDate] = useState("");
  const [mrItems, setMrItems] = useState<DraftMrItem[]>([{ id: "mr-item-1", itemName: "", quantity: "1", unit: "", inventoryId: "" }]);

  const poTotal = poItems.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.unitPrice) || 0), 0);
  const updatePoItem = (id: string, field: keyof Omit<DraftPoItem, "id">, value: string) => setPoItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  const updateMrItem = (id: string, field: keyof Omit<DraftMrItem, "id">, value: string) => setMrItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  const updateGrnLine = (id: string, field: keyof Omit<GrnDraftItem, "id" | "remaining" | "itemName">, value: string) => setGrnLineItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));

  const { data: vendors = [], isLoading: vendorsLoading, error: vendorsError, refetch: refetchVendors } = useQuery({
    queryKey: ["vendors", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      // Select explicit columns only — bank_details is column-revoked at the
      // database level and must never be shipped to the browser.
      const { data, error } = await supabase.from("vendors").select("id, name, email, phone, address, category, is_active, created_at, updated_at").eq("organization_id", orgId).order("name");
      if (error) throw error;
      return (data ?? []) as VendorRow[];
    },
    enabled: !!orgId,
  });

  const { data: pos = [], isLoading: posLoading, error: posError, refetch: refetchPos, dataUpdatedAt: posUpdatedAt } = useQuery({
    queryKey: ["purchase-orders", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from("purchase_orders").select("*, vendors(name)").eq("organization_id", orgId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PoRow[];
    },
    enabled: !!orgId,
  });

  const { data: mrs = [], isLoading: mrsLoading, error: mrsError, refetch: refetchMrs } = useQuery({
    queryKey: ["material-requisitions", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from("material_requisitions").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MrRow[];
    },
    enabled: !!orgId,
  });

  const { data: grnPoItems = [], isLoading: grnItemsLoading } = useQuery({
    queryKey: ["grn-po-items", orgId, grnPoId],
    queryFn: async () => {
      if (!grnPoId) return [] as PoItemRow[];
      const { data, error } = await supabase.from("purchase_order_items").select("*").eq("purchase_order_id", grnPoId).order("created_at");
      if (error) throw error;
      return (data ?? []) as PoItemRow[];
    },
    enabled: !!orgId && !!grnPoId && grnOpen,
  });

  const { data: grns = [], isLoading: grnsLoading, error: grnsError, refetch: refetchGrns } = useQuery({
    queryKey: ["goods-received-notes", orgId],
    queryFn: async () => {
      if (!orgId) return [] as GrnRow[];
      const { data, error } = await supabase
        .from("goods_received_notes")
        .select("*, vendors(name), purchase_orders(document_number), grn_items(item_name, quantity_received)")
        .eq("organization_id", orgId)
        .order("received_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GrnRow[];
    },
    enabled: !!orgId,
  });

  useEffect(() => {
    setGrnLineItems(grnPoItems.map((item) => {
      const remaining = Math.max(0, Number(item.quantity) - Number(item.received_quantity ?? 0));
      return { id: item.id, itemName: item.item_name, remaining, accepted: String(remaining), rejected: "0", lotBatch: "" };
    }));
  }, [grnPoItems]);

  const createVendor = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      const { error } = await supabase.from("vendors").insert({ ...newVendor, organization_id: orgId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Vendor added" });
      setVendorOpen(false);
      setNewVendor({ name: "", email: "", phone: "", address: "", category: "" });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: humanizeError(err), variant: "destructive" }),
  });

  const createPo = useMutation({
    mutationFn: async () => {
      if (!orgId || !poVendorId) throw new Error("Vendor is required");
      const items = poItems.map((item) => ({
        item_name: item.itemName.trim(),
        description: item.description.trim() || null,
        quantity: Number(item.quantity),
        unit: item.unit.trim() || null,
        unit_price: Number(item.unitPrice),
      }));
      if (items.some((item) => !item.item_name || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unit_price) || item.unit_price < 0)) {
        throw new Error("Every purchase-order line needs an item name, positive quantity, and non-negative unit price.");
      }
      const { error } = await industrialDb.rpc("create_purchase_order_with_metadata", {
        _org_id: orgId,
        _vendor_id: poVendorId,
        _project_id: null,
        _delivery_date: null,
        _notes: null,
        _items: items,
        _metadata: { procurement_mode: poMode, vendor_invoice_number: poVendorInvoice.trim(), accounting_folio: poFolio.trim(), site_reference: poSiteReference.trim(), vat_amount: Number(poVat || 0), haulage_cost: Number(poHaulage || 0), exchange_rate: poExchangeRate ? Number(poExchangeRate) : null, amount_paid: Number(poAmountPaid || 0) },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Purchase Order created", description: `${poItems.length} line item${poItems.length === 1 ? "" : "s"} added.` });
      setPoOpen(false);
      setPoVendorId(""); setPoMode("local"); setPoVendorInvoice(""); setPoFolio(""); setPoSiteReference(""); setPoVat(""); setPoHaulage(""); setPoExchangeRate(""); setPoAmountPaid("");
      setPoItems([{ id: `po-item-${Date.now()}`, itemName: "", description: "", quantity: "1", unit: "", unitPrice: "0" }]);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["hr-dashboard-summary", orgId] });
    },
    onError: (err: Error) => toast({ title: "Error", description: humanizeError(err), variant: "destructive" }),
  });

  const createMr = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      const items = mrItems.map((item) => ({
        inventory_id: item.inventoryId || null,
        item_name: item.itemName.trim(),
        quantity: Number(item.quantity),
        unit: item.unit.trim() || null,
      }));
      if (items.some((item) => !item.item_name || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
        throw new Error("Every requisition line needs an item name and positive quantity.");
      }
      const { error } = await industrialDb.rpc("create_material_requisition_with_items", {
        _org_id: orgId,
        _project_id: mrProjectId || null,
        _required_date: mrRequiredDate || null,
        _notes: null,
        _items: items,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Material Requisition created", description: `${mrItems.length} requested line item${mrItems.length === 1 ? "" : "s"} added.` });
      setMrOpen(false);
      setMrProjectId("");
      setMrRequiredDate("");
      setMrItems([{ id: `mr-item-${Date.now()}`, itemName: "", quantity: "1", unit: "", inventoryId: "" }]);
      queryClient.invalidateQueries({ queryKey: ["material-requisitions"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: humanizeError(err), variant: "destructive" }),
  });

  const receiveGoods = useMutation({
    mutationFn: async (poId: string) => {
      if (!orgId || !activeRole) throw new Error("Unauthorized");
      if (!grnLineItems.length) throw new Error("This purchase order has no outstanding line items to receive.");
      const receipts = grnLineItems.map((item) => {
        const accepted = Math.max(0, Number(item.accepted) || 0);
        const rejected = Math.max(0, Number(item.rejected) || 0);
        if (accepted + rejected > item.remaining) throw new Error(`${item.itemName}: accepted plus rejected quantity exceeds the outstanding quantity.`);
        return {
          purchase_order_item_id: item.id,
          accepted_quantity: accepted,
          rejected_quantity: rejected,
          lot_batch: item.lotBatch.trim() || null,
          product_specification_id: null,
        };
      }).filter((item) => item.accepted_quantity > 0 || item.rejected_quantity > 0);
      if (!receipts.length) throw new Error("Enter an accepted or rejected quantity for at least one line.");
      const { error } = await industrialDb.rpc("receive_purchase_order_partial", { _org_id: orgId, _po_id: poId, _receipts: receipts });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Goods received", description: "GRN, inventory, lot, stock movement, remaining quantity, PO status, and audit records were updated." });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["hr-dashboard-summary", orgId] });
      queryClient.invalidateQueries({ queryKey: ["goods-received-notes"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      setGrnPoId("");
      setGrnLineItems([]);
    },
    onError: (err: Error) => toast({ title: "Error receiving goods", description: humanizeError(err), variant: "destructive" }),
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader 
        title="Procurement & Supply Chain" 
        description="Manage vendors, purchase orders, goods receipt, and site requisitions"
        executiveSummary={`${vendors.length} vendors · ${pos.filter((p: any) => p.status !== "closed" && p.status !== "cancelled").length} open POs · ${mrs.filter((m: any) => m.status === "pending").length} pending requisitions`}
        lastUpdated={posUpdatedAt ? new Date(posUpdatedAt) : null}
        onRefresh={() => { refetchVendors(); refetchPos(); refetchMrs(); refetchGrns(); }}
      />

      <WorkflowBanner
        storageKey="procurement"
        summary="The full procurement lifecycle: vendors are registered, requisitions come in from the field, Purchase Orders are issued, and Goods Received Notes (GRN) close the loop and update inventory."
        steps={[
          { actor: "Site Engineer", action: "raises a Material Requisition for items the project needs." },
          { actor: "Procurement / Admin", action: "selects a vendor, issues a Purchase Order, and forwards it to the supplier." },
          { actor: "Warehouse", action: "receives the goods and posts a GRN — inventory updates automatically." },
          { actor: "Finance", action: "matches the invoice to the PO and GRN before releasing payment." },
        ]}
      />

      <Dialog open={grnOpen} onOpenChange={setGrnOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Receive Goods via PO</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Purchase Order *</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={grnPoId} onChange={(e) => setGrnPoId(e.target.value)}>
                <option value="">Select pending PO...</option>
                {pos.filter((p: PoRow) => p.status !== 'received').map((p: PoRow) => <option key={p.id} value={p.id}>{p.document_number} - {p.vendors?.name}</option>)}
              </select>
            </div>
            {grnPoId && (grnItemsLoading ? <p className="text-sm text-muted-foreground">Loading outstanding PO lines…</p> : grnLineItems.length === 0 ? <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-3">No outstanding line items remain on this purchase order.</p> : <div className="space-y-3"><p className="text-xs text-muted-foreground">Enter the accepted and rejected quantities for this receipt. The combined quantity cannot exceed each line’s outstanding balance.</p>{grnLineItems.map((item) => <div key={item.id} className="rounded-lg border p-3 space-y-2"><p className="text-sm font-medium">{item.itemName} <span className="text-xs text-muted-foreground">· {item.remaining.toLocaleString()} outstanding</span></p><div className="grid gap-2 sm:grid-cols-3"><Input type="number" min="0" max={item.remaining} step="0.01" value={item.accepted} onChange={(e) => updateGrnLine(item.id, "accepted", e.target.value)} placeholder="Accepted" /><Input type="number" min="0" max={item.remaining} step="0.01" value={item.rejected} onChange={(e) => updateGrnLine(item.id, "rejected", e.target.value)} placeholder="Rejected" /><Input value={item.lotBatch} onChange={(e) => updateGrnLine(item.id, "lotBatch", e.target.value)} placeholder="Lot / batch (optional)" /></div></div>)}</div>)}
            <Button className="w-full" onClick={() => { receiveGoods.mutate(grnPoId); setGrnOpen(false); }} disabled={!grnPoId || !grnLineItems.length || receiveGoods.isPending}>
              {receiveGoods.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Receive GRN
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="vendors" className="space-y-4">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="vendors" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Vendors
            </TabsTrigger>
            <TabsTrigger value="pos" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Purchase Orders
            </TabsTrigger>
            <TabsTrigger value="grns" className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4" /> Goods Received
            </TabsTrigger>
            <TabsTrigger value="mrs" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Requisitions
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Vendor Master</CardTitle>
              {(isAdmin || isFinance) && (
                <Dialog open={vendorOpen} onOpenChange={setVendorOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Vendor</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Register New Vendor</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Vendor Name *</Label>
                        <Input value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} placeholder="e.g., Nigerian Pipes Ltd" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input value={newVendor.email} onChange={e => setNewVendor({...newVendor, email: e.target.value})} placeholder="sales@vendor.com" />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input value={newVendor.phone} onChange={e => setNewVendor({...newVendor, phone: e.target.value})} placeholder="+234..." />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Input value={newVendor.category} onChange={e => setNewVendor({...newVendor, category: e.target.value})} placeholder="e.g., HDPE Fittings" />
                      </div>
                      <div className="space-y-2">
                        <Label>Address</Label>
                        <Input value={newVendor.address} onChange={e => setNewVendor({...newVendor, address: e.target.value})} placeholder="Physical location" />
                      </div>
                      <Button className="w-full" onClick={() => createVendor.mutate()} disabled={!newVendor.name || createVendor.isPending}>
                        {createVendor.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Register Vendor
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <AsyncBoundary
                loading={vendorsLoading}
                error={vendorsError}
                onRetry={() => refetchVendors()}
                isEmpty={vendors.length === 0}
                loadingVariant="cards"
                loadingRows={3}
                emptyState={{
                  icon: Users,
                  title: "No vendors registered yet",
                  description: "Vendors must be created here before a Purchase Order can be issued. Register the suppliers you actually transact with — contact details flow into POs automatically.",
                  ownedBy: "Finance & Administrators",
                  action: (isAdmin || isFinance) ? { label: "Register first vendor", onClick: () => setVendorOpen(true) } : undefined,
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(vendors as VendorRow[]).map((v) => (
                    <Card key={v.id} className="border-border/50">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-sm">{v.name}</h3>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{v.category || "General Supplier"}</p>
                          </div>
                          <Badge variant={v.is_active ? "default" : "secondary"} className="text-[10px]">
                            {v.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="space-y-1.5">
                          {v.phone && <p className="text-xs flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" /> {v.phone}</p>}
                          {v.email && <p className="text-xs flex items-center gap-2"><Mail className="h-3 w-3 text-muted-foreground" /> {v.email}</p>}
                          {v.address && <p className="text-xs flex items-center gap-2"><MapPin className="h-3 w-3 text-muted-foreground" /> {v.address}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AsyncBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pos" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Purchase Orders</CardTitle>
              {(isAdmin || isFinance) && (
                <Dialog open={poOpen} onOpenChange={setPoOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" />New PO</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Vendor *</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={poVendorId} onChange={(e) => setPoVendorId(e.target.value)}>
                          <option value="">Select a vendor...</option>
                          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <div className="grid gap-2 sm:grid-cols-2"><div><Label>Procurement mode</Label><select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={poMode} onChange={(e) => setPoMode(e.target.value)}><option value="local">Local</option><option value="import">Import</option><option value="forex">Forex</option><option value="open_market">Open market</option></select></div><Input value={poVendorInvoice} onChange={(e) => setPoVendorInvoice(e.target.value)} placeholder="Vendor invoice number" /><Input value={poFolio} onChange={(e) => setPoFolio(e.target.value)} placeholder="Accounting folio" /><Input value={poSiteReference} onChange={(e) => setPoSiteReference(e.target.value)} placeholder="Site / project reference" /><Input type="number" min="0" value={poVat} onChange={(e) => setPoVat(e.target.value)} placeholder="VAT amount" /><Input type="number" min="0" value={poHaulage} onChange={(e) => setPoHaulage(e.target.value)} placeholder="Haulage cost" />{poMode === "forex" && <Input type="number" min="0" value={poExchangeRate} onChange={(e) => setPoExchangeRate(e.target.value)} placeholder="Exchange rate" />}<Input type="number" min="0" value={poAmountPaid} onChange={(e) => setPoAmountPaid(e.target.value)} placeholder="Amount paid" /></div>
                        <div className="flex items-center justify-between gap-2"><Label>Order lines *</Label><Button type="button" size="sm" variant="outline" onClick={() => setPoItems((current) => [...current, { id: `po-item-${Date.now()}`, itemName: "", description: "", quantity: "1", unit: "", unitPrice: "0" }])}><Plus className="h-3.5 w-3.5 mr-1" />Add line</Button></div>
                        {poItems.map((item, index) => <div key={item.id} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">Line {index + 1}</p>{poItems.length > 1 && <Button type="button" size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => setPoItems((current) => current.filter((candidate) => candidate.id !== item.id))}>Remove</Button>}</div>
                          <div className="grid gap-2 sm:grid-cols-2"><Input value={item.itemName} onChange={(e) => updatePoItem(item.id, "itemName", e.target.value)} placeholder="Item name *" /><Input value={item.description} onChange={(e) => updatePoItem(item.id, "description", e.target.value)} placeholder="Description / specification" /><Input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updatePoItem(item.id, "quantity", e.target.value)} placeholder="Quantity *" /><Input value={item.unit} onChange={(e) => updatePoItem(item.id, "unit", e.target.value)} placeholder="Unit (m, pcs, kg)" /><Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updatePoItem(item.id, "unitPrice", e.target.value)} placeholder="Unit price (₦) *" /><p className="flex items-center justify-end text-sm font-semibold sm:col-span-1">Line total: ₦{(Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.unitPrice) || 0)).toLocaleString()}</p></div>
                        </div>)}
                        <div className="flex justify-end border-t pt-3 text-sm font-semibold">PO total: ₦{poTotal.toLocaleString()}</div>
                      </div>
                      <Button className="w-full" onClick={() => createPo.mutate()} disabled={!poVendorId || createPo.isPending || poItems.length === 0}>
                        {createPo.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Create PO
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <AsyncBoundary
                loading={posLoading}
                error={posError}
                onRetry={() => refetchPos()}
                isEmpty={pos.length === 0}
                loadingVariant="list"
                loadingRows={4}
                emptyState={{
                  icon: ShoppingCart,
                  title: "No purchase orders yet",
                  description: "Raise a PO after you've approved a requisition or agreed pricing with a vendor. The PO number flows automatically into the GRN and the matching invoice.",
                  ownedBy: "Finance & Administrators",
                  action: (isAdmin || isFinance) && vendors.length > 0 ? { label: "Create first PO", onClick: () => setPoOpen(true) } : undefined,
                }}
              >
                <div className="space-y-3">
                  {(pos as PoRow[]).map((po) => (
                    <Card key={po.id} className="border-border/50 hover:border-primary/20 transition-colors cursor-pointer">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm">{po.document_number}</span>
                              <Badge variant="outline" className="text-[10px] capitalize">{po.status}</Badge>
                            </div>
                            <p className="text-sm font-medium truncate">{po.vendors?.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(po.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right shrink-0 space-y-2">
                            <p className="font-bold text-sm">₦{po.total_amount?.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">{po.currency}</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2 w-full"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const { generatePdf } = await import("@/lib/generatePdf");
                                const { data: items } = await supabase
                                  .from("purchase_order_items")
                                  .select("*")
                                  .eq("purchase_order_id", po.id);
                                const isFinal = po.status === "received" || po.status === "approved" || po.status === "sent";
                                generatePdf({
                                  title: `Purchase Order ${po.document_number}`,
                                  senderName: "NIF Technical Services Ltd",
                                  senderDepartment: "Procurement",
                                  contentSections: [
                                    { heading: "Vendor", body: po.vendors?.name ?? "—" },
                                    { heading: "Details", bullets: [
                                      `Status: ${po.status}`,
                                      `Currency: ${po.currency}`,
                                      `Date: ${new Date(po.created_at).toLocaleDateString()}`,
                                    ]},
                                  ],
                                  tableData: items && items.length > 0 ? {
                                    columns: [
                                      { header: "Description", dataKey: "description" },
                                      { header: "Qty", dataKey: "quantity" },
                                      { header: "Unit Price (₦)", dataKey: "unit_price" },
                                      { header: "Total (₦)", dataKey: "total_price" },
                                    ],
                                    rows: (items as PoItemRow[]).map((i) => ({
                                      description: i.description,
                                      quantity: i.quantity,
                                      unit_price: Number(i.unit_price).toLocaleString(),
                                      total_price: Number(i.total_price).toLocaleString(),
                                    })),
                                    summary: [{ label: "Grand Total", value: `₦${Number(po.total_amount ?? 0).toLocaleString()}` }],
                                  } : undefined,
                                  stampType: isFinal ? "admin" : null,
                                  watermark: isFinal ? "FINAL" : "DRAFT",
                                });
                              }}
                            >
                              <FileDown className="h-3 w-3 mr-1" />PDF
                            </Button>
                            {(isAdmin || isWarehouse) && po.status !== "received" && po.status !== "cancelled" && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-6 text-[10px] px-2 w-full" 
                                onClick={(e) => { e.stopPropagation(); setGrnPoId(po.id); setGrnLineItems([]); setGrnOpen(true); }}
                                disabled={receiveGoods.isPending}
                              >
                                {receiveGoods.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Receive GRN"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AsyncBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grns" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Goods Received Notes (GRN)</CardTitle>
              {(isAdmin || isWarehouse) && (
                <Button size="sm" onClick={() => { setGrnPoId(""); setGrnLineItems([]); setGrnOpen(true); }}><Plus className="h-4 w-4 mr-1" />Receive Goods</Button>
              )}
            </CardHeader>
            <CardContent>
              <AsyncBoundary
                loading={grnsLoading}
                error={grnsError}
                onRetry={() => refetchGrns()}
                isEmpty={grns.length === 0}
                loadingVariant="list"
                loadingRows={3}
                emptyState={{
                  icon: PackageCheck,
                  title: "No goods received yet",
                  description: "A GRN confirms that the items on a Purchase Order arrived in the warehouse. Posting a GRN automatically updates inventory and unlocks vendor payment.",
                  ownedBy: "Warehouse & Administrators",
                  action: (isAdmin || isWarehouse) && pos.some((p: PoRow) => p.status !== "received") ? { label: "Receive goods", onClick: () => setGrnOpen(true) } : undefined,
                }}
              >
                <div className="space-y-3">
                  {(grns as GrnRow[]).map((grn) => (
                    <Card key={grn.id} className="border-border/50">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm">{grn.document_number ?? "Goods Received Note"}</span>
                              <Badge variant="outline" className="text-[10px] capitalize">{grn.status ?? "posted"}</Badge>
                            </div>
                            <p className="text-sm">{grn.vendors?.name ?? "Vendor not specified"}</p>
                            <p className="text-xs text-muted-foreground">PO: {grn.purchase_orders?.document_number ?? "—"} · Received: {grn.received_date ?? "—"}</p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground shrink-0">
                            <p>{grn.grn_items?.length ?? 0} line{(grn.grn_items?.length ?? 0) === 1 ? "" : "s"}</p>
                            <p className="font-medium text-foreground">{(grn.grn_items ?? []).reduce((sum, item) => sum + Number(item.quantity_received ?? 0), 0).toLocaleString()} received</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AsyncBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mrs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Material Requisitions</CardTitle>
              <Dialog open={mrOpen} onOpenChange={setMrOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Requisition</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Material Requisition</DialogTitle></DialogHeader>
                                      <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Required Date</Label>
                      <Input type="date" value={mrRequiredDate} onChange={e => setMrRequiredDate(e.target.value)} />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2"><Label>Requested materials *</Label><Button type="button" size="sm" variant="outline" onClick={() => setMrItems((current) => [...current, { id: `mr-item-${Date.now()}`, itemName: "", quantity: "1", unit: "", inventoryId: "" }])}><Plus className="h-3.5 w-3.5 mr-1" />Add line</Button></div>
                      {mrItems.map((item, index) => <div key={item.id} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">Line {index + 1}</p>{mrItems.length > 1 && <Button type="button" size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => setMrItems((current) => current.filter((candidate) => candidate.id !== item.id))}>Remove</Button>}</div>
                        <div className="grid gap-2 sm:grid-cols-3"><Input className="sm:col-span-2" value={item.itemName} onChange={(e) => updateMrItem(item.id, "itemName", e.target.value)} placeholder="Material / item name *" /><Input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateMrItem(item.id, "quantity", e.target.value)} placeholder="Quantity *" /><Input value={item.unit} onChange={(e) => updateMrItem(item.id, "unit", e.target.value)} placeholder="Unit (m, pcs, kg)" /></div>
                      </div>)}
                    </div>
                    <Button className="w-full" onClick={() => createMr.mutate()} disabled={createMr.isPending || mrItems.length === 0}>

                      {createMr.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Requisition
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <AsyncBoundary
                loading={mrsLoading}
                error={mrsError}
                onRetry={() => refetchMrs()}
                isEmpty={mrs.length === 0}
                loadingVariant="list"
                loadingRows={3}
                emptyState={{
                  icon: ClipboardList,
                  title: "No site requisitions yet",
                  description: "Material Requisitions are how site engineers tell procurement what the project needs next. Once approved, they become Purchase Orders.",
                  ownedBy: "Site Engineers",
                  action: { label: "Raise a requisition", onClick: () => setMrOpen(true) },
                }}
              >
                <div className="space-y-3">
                  {(mrs as MrRow[]).map((mr) => (
                    <Card key={mr.id} className="border-border/50 hover:border-primary/20 transition-colors cursor-pointer">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm">{mr.document_number}</span>
                              <Badge variant="outline" className="text-[10px] capitalize">{mr.status}</Badge>
                            </div>
                            <p className="text-sm font-medium truncate">{mr.project_id ? `Project: ${mr.project_id.slice(0, 8)}…` : "General"}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Requested: {new Date(mr.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            {mr.required_date && (
                              <p className="text-[10px] text-muted-foreground">Needed by: {mr.required_date}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AsyncBoundary>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Procurement;
