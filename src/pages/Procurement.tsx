import { useState } from "react";
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
import { Plus, Users, ShoppingCart, PackageCheck, ClipboardList, Search, Filter, Loader2, Phone, Mail, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type VendorRow = Database["public"]["Tables"]["vendors"]["Row"];
type PoRow = Database["public"]["Tables"]["purchase_orders"]["Row"] & { vendors?: { name: string } | null };
type MrRow = Database["public"]["Tables"]["material_requisitions"]["Row"];
type PoItemRow = Database["public"]["Tables"]["purchase_order_items"]["Row"];

const Procurement = () => {
  const { user, activeRole, memberships } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = memberships[0]?.organization_id;
  const isAdmin = activeRole === "administrator";
  const isFinance = activeRole === "finance";
  const isWarehouse = activeRole === "warehouse";

  const [vendorOpen, setVendorOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [grnOpen, setGrnOpen] = useState(false);
  const [mrOpen, setMrOpen] = useState(false);

  const [newVendor, setNewVendor] = useState({ name: "", email: "", phone: "", address: "", category: "" });
  
  // PO state
  const [poVendorId, setPoVendorId] = useState("");
  const [poAmount, setPoAmount] = useState("");
  
  // GRN state
  const [grnPoId, setGrnPoId] = useState("");
  
  // MR state
  const [mrProjectId, setMrProjectId] = useState("");
  const [mrRequiredDate, setMrRequiredDate] = useState("");

  const { data: vendors = [], isLoading: vendorsLoading, error: vendorsError, refetch: refetchVendors } = useQuery({
    queryKey: ["vendors", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*").order("name");
      return (data ?? []) as VendorRow[];
    },
    enabled: !!orgId,
  });

  const { data: pos = [], isLoading: posLoading, error: posError, refetch: refetchPos } = useQuery({
    queryKey: ["purchase-orders", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("purchase_orders").select("*, vendors(name)").order("created_at", { ascending: false });
      return (data ?? []) as PoRow[];
    },
    enabled: !!orgId,
  });

  const { data: mrs = [], isLoading: mrsLoading, error: mrsError, refetch: refetchMrs } = useQuery({
    queryKey: ["material-requisitions", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("material_requisitions").select("*").order("created_at", { ascending: false });
      return (data ?? []) as MrRow[];
    },
    enabled: !!orgId,
  });

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
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createPo = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      const currentUser = user ?? (await supabase.auth.getUser()).data.user;
      if (!currentUser) throw new Error("Not logged in");
      const { error } = await supabase.from("purchase_orders").insert({
        organization_id: orgId,
        vendor_id: poVendorId,
        total_amount: parseFloat(poAmount) || 0,
        currency: "NGN",
        status: "draft",
        document_number: `PO-${Date.now().toString().slice(-6)}`,
        created_by: currentUser.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Purchase Order created" });
      setPoOpen(false);
      setPoVendorId("");
      setPoAmount("");
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createMr = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      const currentUser = user ?? (await supabase.auth.getUser()).data.user;
      if (!currentUser) throw new Error("Not logged in");
      const { error } = await supabase.from("material_requisitions").insert({
        organization_id: orgId,
        project_id: mrProjectId || null,
        required_date: mrRequiredDate || null,
        status: "draft",
        document_number: `MR-${Date.now().toString().slice(-6)}`,
        requested_by: currentUser.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Material Requisition created" });
      setMrOpen(false);
      setMrProjectId("");
      setMrRequiredDate("");
      queryClient.invalidateQueries({ queryKey: ["material-requisitions"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const receiveGoods = useMutation({
    mutationFn: async (poId: string) => {
      if (!orgId || !activeRole) throw new Error("Unauthorized");
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not logged in");

      const po = pos.find((p: PoRow) => p.id === poId);
      if (!po) throw new Error("PO not found");

      // 1. Create GRN as pending
      const { data: grn, error: grnErr } = await supabase
        .from("goods_received_notes")
        .insert({
          organization_id: orgId,
          purchase_order_id: poId,
          vendor_id: po.vendor_id,
          received_by: user.id,
          status: "pending",
        })
        .select()
        .single();
      if (grnErr) throw grnErr;

      // 2. Fetch PO Items
      const { data: items, error: itemsErr } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("purchase_order_id", poId);
      if (itemsErr) throw itemsErr;

      // 3. Create GRN items
      if (items && items.length > 0) {
        const grnItems = (items as PoItemRow[]).map((item) => ({
          grn_id: grn.id,
          purchase_order_item_id: item.id,
          item_name: item.item_name,
          quantity_received: item.quantity,
          condition: "good",
        }));
        const { error: insertErr } = await supabase.from("grn_items").insert(grnItems);
        if (insertErr) throw insertErr;
      }

      // 4. Update GRN to accepted to trigger inventory stock update
      const { error: acceptErr } = await supabase
        .from("goods_received_notes")
        .update({ status: "accepted" })
        .eq("id", grn.id);
      if (acceptErr) throw acceptErr;

      // 5. Update PO status
      const { error: poUpdErr } = await supabase
        .from("purchase_orders")
        .update({ status: "received" })
        .eq("id", poId);
      if (poUpdErr) throw poUpdErr;
    },
    onSuccess: () => {
      toast({ title: "Goods Received", description: "Inventory has been updated automatically." });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      // The user wants to update Inventory.tsx on GRN receipt, let's invalidate inventory query if it exists
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (err: Error) => toast({ title: "Error receiving goods", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader 
        title="Procurement & Supply Chain" 
        description="Manage vendors, purchase orders, goods receipt, and site requisitions"
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
                      <div className="space-y-2">
                        <Label>Total Amount (₦)</Label>
                        <Input type="number" value={poAmount} onChange={e => setPoAmount(e.target.value)} placeholder="0" />
                      </div>
                      <Button className="w-full" onClick={() => createPo.mutate()} disabled={!poVendorId || createPo.isPending}>
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
                            {(isAdmin || isWarehouse) && po.status !== "received" && po.status !== "cancelled" && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-6 text-[10px] px-2 w-full" 
                                onClick={(e) => { e.stopPropagation(); receiveGoods.mutate(po.id); }}
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
                <Dialog open={grnOpen} onOpenChange={setGrnOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" />Receive Goods</Button>
                  </DialogTrigger>
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
                      <Button className="w-full" onClick={() => { receiveGoods.mutate(grnPoId); setGrnOpen(false); }} disabled={!grnPoId || receiveGoods.isPending}>
                        {receiveGoods.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Receive GRN
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={PackageCheck}
                title="No goods received yet"
                description="A GRN confirms that the items on a Purchase Order arrived in the warehouse. Posting a GRN automatically updates inventory and unlocks vendor payment."
                ownedBy="Warehouse & Administrators"
                action={(isAdmin || isWarehouse) && pos.some((p: PoRow) => p.status !== 'received') ? { label: "Receive goods", onClick: () => setGrnOpen(true) } : undefined}
              />
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
                    <Button className="w-full" onClick={() => createMr.mutate()} disabled={createMr.isPending}>
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
