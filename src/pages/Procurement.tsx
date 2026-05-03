import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
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

const Procurement = () => {
  const { activeRole, memberships } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = memberships[0]?.organization_id;
  const isAdmin = activeRole === "administrator";
  const isFinance = activeRole === "finance";
  const isWarehouse = activeRole === "warehouse";

  const [vendorOpen, setVendorOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: "", email: "", phone: "", address: "", category: "" });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["vendors", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*").order("name");
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: pos = [], isLoading: posLoading } = useQuery({
    queryKey: ["purchase-orders", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("purchase_orders").select("*, vendors(name)").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: mrs = [], isLoading: mrsLoading } = useQuery({
    queryKey: ["material-requisitions", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("material_requisitions").select("*, projects(name)").order("created_at", { ascending: false });
      return data ?? [];
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
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const receiveGoods = useMutation({
    mutationFn: async (poId: string) => {
      if (!orgId || !activeRole) throw new Error("Unauthorized");
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not logged in");

      const po = pos.find((p: any) => p.id === poId);
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
        const grnItems = items.map((item: any) => ({
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
    onError: (err: any) => toast({ title: "Error receiving goods", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader 
        title="Procurement & Supply Chain" 
        description="Manage vendors, purchase orders, goods receipt, and site requisitions"
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
              {vendorsLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : vendors.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No vendors registered yet. Add your first supplier to start procurement.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vendors.map((v: any) => (
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pos" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Purchase Orders</CardTitle>
              {(isAdmin || isFinance) && (
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />New PO</Button>
              )}
            </CardHeader>
            <CardContent>
              {posLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : pos.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No purchase orders found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pos.map((po: any) => (
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grns" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Goods Received Notes (GRN)</CardTitle>
              {(isAdmin || isWarehouse) && (
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />Receive Goods</Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-center p-12 text-muted-foreground">
                <PackageCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No GRNs recorded.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mrs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Material Requisitions</CardTitle>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Requisition</Button>
            </CardHeader>
            <CardContent>
              {mrsLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : mrs.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No requisitions from site yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mrs.map((mr: any) => (
                    <Card key={mr.id} className="border-border/50 hover:border-primary/20 transition-colors cursor-pointer">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm">{mr.document_number}</span>
                              <Badge variant="outline" className="text-[10px] capitalize">{mr.status}</Badge>
                            </div>
                            <p className="text-sm font-medium truncate">{mr.projects?.name || "General"}</p>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Procurement;
