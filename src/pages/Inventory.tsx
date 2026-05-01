import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, AlertTriangle, Loader2, Pencil, Trash2, MapPin } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useGsapStagger } from "@/hooks/useGsapAnimation";
import { formatCurrency } from "@/lib/constants";
import { AiInsightPanel } from "@/components/AiInsightPanel";
import { InventoryFinder } from "@/components/InventoryFinder";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type InventoryItem = Database["public"]["Tables"]["inventory"]["Row"] & { 
  storage_locations?: { name: string } | null;
  storage_boxes?: { box_code: string; label: string | null } | null;
};
type StorageLocation = Database["public"]["Tables"]["storage_locations"]["Row"];
type StorageBox = Database["public"]["Tables"]["storage_boxes"]["Row"] & {
  storage_locations?: { name: string } | null;
};

const Inventory = () => {
  const { user, memberships, activeRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = memberships[0]?.organization_id;
  const canEdit = ["administrator", "warehouse"].includes(activeRole ?? "");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const listRef = useGsapStagger(".gsap-card", 0.05);

  // Form state
  const [itemName, setItemName] = useState("");
  const [itemType, setItemType] = useState("");
  const [diameter, setDiameter] = useState("");
  const [quantity, setQuantity] = useState("");
  const [minStock, setMinStock] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [locationId, setLocationId] = useState("");
  const [boxId, setBoxId] = useState("");

  // Storage management dialogs
  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [locName, setLocName] = useState("");
  const [locDesc, setLocDesc] = useState("");
  const [boxDialogOpen, setBoxDialogOpen] = useState(false);
  const [boxCode, setBoxCode] = useState("");
  const [boxLabel, setBoxLabel] = useState("");
  const [boxLocId, setBoxLocId] = useState("");

  const { data: inventory = [], isLoading, refetch } = useQuery({
    queryKey: ["inventory", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from("inventory").select("*, storage_locations(name), storage_boxes(box_code, label)").eq("organization_id", orgId).order("item_name");
      if (error) throw error;
      return (data as unknown as InventoryItem[]) ?? [];
    },
    enabled: !!orgId,
  });

  const { data: locations = [], refetch: refetchLocs } = useQuery({
    queryKey: ["storage-locations", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("storage_locations").select("*").eq("organization_id", orgId).order("name");
      return (data as StorageLocation[]) ?? [];
    },
    enabled: !!orgId,
  });

  const { data: boxes = [], refetch: refetchBoxes } = useQuery({
    queryKey: ["storage-boxes", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("storage_boxes").select("*, storage_locations(name)").eq("organization_id", orgId).order("box_code");
      return (data as unknown as StorageBox[]) ?? [];
    },
    enabled: !!orgId,
  });

  const resetForm = () => {
    setItemName(""); setItemType(""); setDiameter(""); setQuantity("");
    setMinStock(""); setUnitCost(""); setSupplier(""); setSupplierPhone("");
    setLocationId(""); setBoxId("");
    setEditingItem(null);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setItemName(item.item_name);
    setItemType(item.item_type || "hdpe");
    setDiameter(item.diameter_mm?.toString() || "");
    setQuantity(item.quantity_meters?.toString() || "");
    setMinStock(item.min_stock_level?.toString() || "");
    setUnitCost(item.unit_cost?.toString() || "");
    setSupplier(item.supplier || "");
    setSupplierPhone(item.supplier_phone || "");
    setLocationId(item.location_id || "none");
    setBoxId(item.box_id || "none");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !user || !itemName.trim()) return;
    setSaving(true);
    try {
      const payload: Database["public"]["Tables"]["inventory"]["Insert"] = {
        organization_id: orgId,
        item_name: itemName.trim(),
        item_type: (itemType || "hdpe") as "hdpe" | "pvc" | "custom",
        diameter_mm: diameter ? parseInt(diameter) : null,
        quantity_meters: quantity ? parseFloat(quantity) : 0,
        min_stock_level: minStock ? parseFloat(minStock) : 10,
        unit_cost: unitCost ? parseFloat(unitCost) : 0,
        supplier: supplier || null,
        supplier_phone: supplierPhone || null,
        location_id: locationId && locationId !== "none" ? locationId : null,
        box_id: boxId && boxId !== "none" ? boxId : null,
      };
      if (editingItem) {
        const { error } = await supabase.from("inventory").update(payload as Database["public"]["Tables"]["inventory"]["Update"]).eq("id", editingItem.id);
        if (error) throw error;
        toast({ title: "Item updated" });
      } else {
        const { error } = await supabase.from("inventory").insert(payload);
        if (error) throw error;
        toast({ title: "Item added" });
      }
      resetForm();
      setDialogOpen(false);
      refetch();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !locName.trim()) return;
    const { error } = await supabase.from("storage_locations").insert({ organization_id: orgId, name: locName.trim(), description: locDesc || null });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Location added" });
    setLocName(""); setLocDesc(""); setLocDialogOpen(false); refetchLocs();
  };

  const addBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !boxCode.trim() || !boxLocId) return;
    const { error } = await supabase.from("storage_boxes").insert({ organization_id: orgId, box_code: boxCode.trim(), label: boxLabel || null, location_id: boxLocId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Box added" });
    setBoxCode(""); setBoxLabel(""); setBoxLocId(""); setBoxDialogOpen(false); refetchBoxes();
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Item deleted" });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      const error = err as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filtered = inventory.filter((item: InventoryItem) => {
    const matchesSearch = item.item_name.toLowerCase().includes(search.toLowerCase()) || (item.supplier ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || item.item_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const lowStockCount = inventory.filter((i: InventoryItem) => (i.quantity_meters ?? 0) < (i.min_stock_level ?? 0)).length;
  const totalValue = inventory.reduce((s: number, i: InventoryItem) => s + (i.quantity_meters ?? 0) * (i.unit_cost ?? 0), 0);

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const filteredBoxes = locationId ? boxes.filter((b: StorageBox) => b.location_id === locationId) : boxes;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader title="Inventory" description="Track pipe and fittings stock">
        <div className="flex gap-2 flex-wrap">
          {canEdit && (
            <>
              <Dialog open={locDialogOpen} onOpenChange={setLocDialogOpen}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><MapPin className="h-3.5 w-3.5 mr-1" /> Location</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Storage Location</DialogTitle></DialogHeader>
                  <form className="space-y-4" onSubmit={addLocation}>
                    <div className="space-y-2"><Label>Name *</Label><Input placeholder="e.g. Rack A, Zone 1" value={locName} onChange={(e) => setLocName(e.target.value)} required /></div>
                    <div className="space-y-2"><Label>Description</Label><Input placeholder="Optional description" value={locDesc} onChange={(e) => setLocDesc(e.target.value)} /></div>
                    <Button type="submit">Save</Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Dialog open={boxDialogOpen} onOpenChange={setBoxDialogOpen}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Package className="h-3.5 w-3.5 mr-1" /> Box</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Storage Box</DialogTitle></DialogHeader>
                  <form className="space-y-4" onSubmit={addBox}>
                    <div className="space-y-2"><Label>Box Code *</Label><Input placeholder="e.g. BX-001" value={boxCode} onChange={(e) => setBoxCode(e.target.value)} required /></div>
                    <div className="space-y-2"><Label>Label</Label><Input placeholder="Optional label" value={boxLabel} onChange={(e) => setBoxLabel(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Location *</Label>
                      <Select value={boxLocId} onValueChange={setBoxLocId}><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                        <SelectContent>{locations.map((l: StorageLocation) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button type="submit">Save</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingItem ? "Edit Item" : "Add Inventory Item"}</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2"><Label>Item Name *</Label><Input placeholder="e.g. HDPE Pipe 110mm" value={itemName} onChange={(e) => setItemName(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Type</Label>
                    <Select value={itemType} onValueChange={setItemType}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="hdpe">HDPE</SelectItem><SelectItem value="pvc">PVC</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Diameter (mm)</Label><Input type="number" placeholder="110" value={diameter} onChange={(e) => setDiameter(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Quantity (meters/pcs)</Label><Input type="number" placeholder="100" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Min Stock Level</Label><Input type="number" placeholder="50" value={minStock} onChange={(e) => setMinStock(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Unit Cost (₦)</Label><Input type="number" placeholder="3500" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Supplier</Label><Input placeholder="Supplier name" value={supplier} onChange={(e) => setSupplier(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Supplier Phone</Label><Input placeholder="+234..." value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Storage Location</Label>
                    <Select value={locationId} onValueChange={(v) => { setLocationId(v); setBoxId(""); }}><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {locations.map((l: StorageLocation) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Storage Box</Label>
                    <Select value={boxId} onValueChange={setBoxId}><SelectTrigger><SelectValue placeholder="Select box" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {filteredBoxes.map((b: StorageBox) => <SelectItem key={b.id} value={b.id}>{b.box_code} {b.label ? `(${b.label})` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}{editingItem ? "Update" : "Save"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border-border/50"><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Total Items</p>
          <p className="text-2xl font-bold">{inventory.length}</p>
        </CardContent></Card>
        <Card className="border-border/50"><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Low Stock</p>
          <p className="text-2xl font-bold text-destructive">{lowStockCount}</p>
        </CardContent></Card>
        <Card className="border-border/50 col-span-2 sm:col-span-1"><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Total Value</p>
          <p className="text-xl sm:text-2xl font-bold text-primary">{formatCurrency(totalValue)}</p>
        </CardContent></Card>
      </div>

      <InventoryFinder />

      <AiInsightPanel context="inventory" title="Inventory AI" suggestions={["Demand forecast for next month", "Detect abnormal usage", "Suggest reorder quantities", "Low stock risk analysis"]} data={inventory} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items or suppliers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="hdpe">HDPE</SelectItem>
            <SelectItem value="pvc">PVC</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div ref={listRef} className="space-y-2">
        {filtered.length === 0 && (
          <Card className="border-border/50"><CardContent className="py-8 text-center text-muted-foreground">
            {inventory.length === 0 ? "No inventory items yet. Add your first item above." : "No items match your search."}
          </CardContent></Card>
        )}
        {filtered.map((item: InventoryItem) => {
          const isLow = (item.quantity_meters ?? 0) < (item.min_stock_level ?? 0);
          const locName = item.storage_locations?.name;
          const boxCode = item.storage_boxes?.box_code;
          return (
            <Card key={item.id} className={`gsap-card border-border/50 transition-all hover:shadow-sm ${isLow ? "border-l-2 border-l-destructive" : ""}`}>
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    {isLow ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Package className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground">{item.supplier ?? "No supplier"} · {item.diameter_mm ?? "—"}mm · {formatCurrency(item.unit_cost ?? 0)}/unit</p>
                    {locName && (
                      <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {locName}{boxCode ? ` → ${boxCode}` : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-sm">{item.quantity_meters ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Min: {item.min_stock_level ?? 0}</p>
                  </div>
                  <Badge variant={item.item_type === "hdpe" ? "default" : "secondary"} className="uppercase text-xs">{item.item_type ?? "hdpe"}</Badge>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The item will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Inventory;
