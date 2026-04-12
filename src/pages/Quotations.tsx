import { useState } from "react";
import { QuotationCard } from "@/components/quotations/QuotationCard";
import { QuotationSummary } from "@/components/quotations/QuotationSummary";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Search, Trash2, Loader2, MoreVertical, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useGsapStagger } from "@/hooks/useGsapAnimation";
import { formatCurrency } from "@/lib/constants";
import { AiInsightPanel } from "@/components/AiInsightPanel";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface QuotationItem {
  id: string; description: string; type: string; quantity: number; unitPrice: number; total: number;
  diameterMm?: number; lengthMeters?: number;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary", sent: "outline", accepted: "default", rejected: "destructive",
};
const allQStatuses = ["draft", "sent", "accepted", "rejected"];

const Quotations = () => {
  const { user, memberships, activeRole, isMaintenance } = useAuth();
  const { toast } = useToast();
  const orgId = memberships[0]?.organization_id;
  const canEdit = activeRole === "administrator" || activeRole === "reception_sales" || activeRole === "finance" || isMaintenance;
  const canDelete = activeRole === "administrator" || isMaintenance;
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [pipeType, setPipeType] = useState("hdpe");
  const [profitMargin, setProfitMargin] = useState(15);
  const [laborCost, setLaborCost] = useState(500);
  const [transportCost, setTransportCost] = useState(50000);
  const [clientId, setClientId] = useState("");
  const [lumpSumAmount, setLumpSumAmount] = useState("");
  const [lumpSumDesc, setLumpSumDesc] = useState("");
  const [editingQuotation, setEditingQuotation] = useState<any>(null);
  const listRef = useGsapStagger(".gsap-card", 0.06);

  const { data: quotations = [], isLoading, refetch } = useQuery({
    queryKey: ["quotations", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from("quotations").select("*, clients(name), quotation_items(count)").eq("organization_id", orgId).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-quotation", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("clients").select("id, name").eq("organization_id", orgId).order("name");
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const addItem = () => setItems([...items, { id: Date.now().toString(), description: "", type: "pipe", quantity: 1, unitPrice: 0, total: 0 }]);
  const updateItem = (id: string, field: string, value: string | number) => {
    setItems(items.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      updated.total = updated.quantity * updated.unitPrice;
      return updated;
    }));
  };
  const removeItem = (id: string) => setItems(items.filter((i) => i.id !== id));

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const laborTotal = items.filter((i) => i.type === "pipe").reduce((s, i) => s + i.quantity, 0) * laborCost;
  const profitAmount = (subtotal + laborTotal + transportCost) * (profitMargin / 100);
  const grandTotal = subtotal + laborTotal + transportCost + profitAmount;

  const resetForm = () => {
    setItems([]); setClientId(""); setPipeType("hdpe"); setProfitMargin(15);
    setLaborCost(500); setTransportCost(50000); setEditingQuotation(null);
    setLumpSumAmount(""); setLumpSumDesc("");
  };

  /** Load existing quotation for editing */
  const openEditQuotation = async (q: any) => {
    setEditingQuotation(q);
    setClientId(q.client_id ?? "");
    setPipeType(q.pipe_type ?? "hdpe");
    setProfitMargin(q.profit_margin_percent ?? 15);
    setLaborCost(q.labor_cost_per_meter ?? 500);
    setTransportCost(q.transport_cost ?? 50000);

    if (q.is_lump_sum) {
      setLumpSumAmount(q.lump_sum_amount?.toString() ?? "");
      setLumpSumDesc(q.notes ?? "");
    } else {
      // Load line items
      const { data: lineItems } = await supabase.from("quotation_items").select("*").eq("quotation_id", q.id);
      if (lineItems) {
        setItems(lineItems.map((li: any) => ({
          id: li.id,
          description: li.description,
          type: li.item_type,
          quantity: li.quantity,
          unitPrice: li.unit_price,
          total: li.total_price,
        })));
      }
    }
    setDialogOpen(true);
  };

  const handleSave = async (status: "draft" | "sent") => {
    if (!orgId || !user) return;
    setSaving(true);
    try {
      if (editingQuotation) {
        // Update existing
        const { error } = await supabase.from("quotations").update({
          client_id: clientId || null, pipe_type: pipeType as any,
          profit_margin_percent: profitMargin, labor_cost_per_meter: laborCost,
          transport_cost: transportCost, subtotal, total_amount: grandTotal, status: status as any, is_lump_sum: false,
        }).eq("id", editingQuotation.id);
        if (error) throw error;
        // Replace line items
        await supabase.from("quotation_items").delete().eq("quotation_id", editingQuotation.id);
        if (items.length > 0) {
          await supabase.from("quotation_items").insert(items.map(i => ({
            quotation_id: editingQuotation.id, description: i.description, item_type: i.type as any,
            quantity: i.quantity, unit_price: i.unitPrice, total_price: i.total,
          })));
        }
        toast({ title: "Quotation updated" });
      } else {
        const qNum = `QT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
        const { data: quotation, error } = await supabase.from("quotations").insert({
          organization_id: orgId, created_by: user.id, client_id: clientId || null, quotation_number: qNum,
          pipe_type: pipeType as any, profit_margin_percent: profitMargin, labor_cost_per_meter: laborCost,
          transport_cost: transportCost, subtotal, total_amount: grandTotal, status: status as any, is_lump_sum: false,
        }).select().single();
        if (error) throw error;
        if (items.length > 0 && quotation) {
          await supabase.from("quotation_items").insert(items.map(i => ({
            quotation_id: quotation.id, description: i.description, item_type: i.type as any,
            quantity: i.quantity, unit_price: i.unitPrice, total_price: i.total,
          })));
        }
        toast({ title: status === "draft" ? "Saved as draft" : "Quotation sent" });
      }
      resetForm(); setDialogOpen(false); refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleSaveLumpSum = async () => {
    if (!orgId || !user || !lumpSumAmount) return;
    setSaving(true);
    try {
      if (editingQuotation) {
        const { error } = await supabase.from("quotations").update({
          client_id: clientId || null, is_lump_sum: true,
          lump_sum_amount: parseFloat(lumpSumAmount), total_amount: parseFloat(lumpSumAmount),
          notes: lumpSumDesc || null,
        }).eq("id", editingQuotation.id);
        if (error) throw error;
        toast({ title: "Quotation updated" });
      } else {
        const qNum = `QT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
        const { error } = await supabase.from("quotations").insert({
          organization_id: orgId, created_by: user.id, client_id: clientId || null, quotation_number: qNum,
          is_lump_sum: true, lump_sum_amount: parseFloat(lumpSumAmount), total_amount: parseFloat(lumpSumAmount),
          notes: lumpSumDesc || null, status: "draft" as any,
        });
        if (error) throw error;
        toast({ title: "Quotation saved" });
      }
      resetForm(); setDialogOpen(false); refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from("quotations").update({ status: status as any }).eq("id", id);
      if (error) throw error;
      toast({ title: `Status → ${status}` });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await supabase.from("quotation_items").delete().eq("quotation_id", deleteTarget.id);
      const { error } = await supabase.from("quotations").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Quotation deleted" });
      setDeleteTarget(null);
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handlePrint = async (q: any) => {
    const { generatePdf } = await import("@/lib/generatePdf");
    // Fetch line items for table
    const { data: lineItems } = await supabase.from("quotation_items").select("*").eq("quotation_id", q.id);

    if (lineItems && lineItems.length > 0) {
      generatePdf({
        title: `Quotation ${q.quotation_number}`,
        contentSections: [
          { heading: "Client", body: q.clients?.name ?? "N/A" },
          { heading: "Details", bullets: [
            `Pipe Type: ${q.pipe_type ?? "N/A"}`,
            `Date: ${new Date(q.created_at).toLocaleDateString()}`,
            `Status: ${q.status}`,
            q.notes ? `Notes: ${q.notes}` : "",
          ].filter(Boolean) },
        ],
        tableData: {
          columns: [
            { header: "#", dataKey: "num" },
            { header: "Description", dataKey: "description" },
            { header: "Type", dataKey: "type" },
            { header: "Qty", dataKey: "quantity" },
            { header: "Unit Price (₦)", dataKey: "unitPrice" },
            { header: "Total (₦)", dataKey: "total" },
          ],
          rows: lineItems.map((li: any, idx: number) => ({
            num: idx + 1,
            description: li.description,
            type: li.item_type,
            quantity: li.quantity,
            unitPrice: Number(li.unit_price).toLocaleString(),
            total: Number(li.total_price).toLocaleString(),
          })),
          summary: [
            { label: "Subtotal", value: formatCurrency(q.subtotal ?? 0) },
            ...(q.labor_cost_per_meter ? [{ label: "Labor", value: `${formatCurrency(q.labor_cost_per_meter)}/m` }] : []),
            ...(q.transport_cost ? [{ label: "Transport", value: formatCurrency(q.transport_cost) }] : []),
            ...(q.profit_margin_percent ? [{ label: `Profit (${q.profit_margin_percent}%)`, value: "" }] : []),
            { label: "Grand Total", value: formatCurrency(q.total_amount ?? 0) },
          ],
        },
        stampType: q.status === "accepted" ? "admin" : null,
      });
    } else {
      // Lump sum or no items
      generatePdf({
        title: `Quotation ${q.quotation_number}`,
        content: `Client: ${q.clients?.name ?? "N/A"}\nTotal Amount: ${formatCurrency(q.total_amount ?? 0)}\nStatus: ${q.status}\nPipe Type: ${q.pipe_type ?? "N/A"}\nDate: ${new Date(q.created_at).toLocaleDateString()}${q.notes ? `\n\nNotes:\n${q.notes}` : ""}`,
        stampType: q.status === "accepted" ? "admin" : null,
      });
    }
  };

  const filtered = quotations.filter(
    (q: any) => q.quotation_number.toLowerCase().includes(search.toLowerCase()) || (q.clients?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="p-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader title="Quotations" description="Create and manage pipe quotations">
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Quotation</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingQuotation ? "Edit" : "Create New"} Quotation</DialogTitle></DialogHeader>
              <Tabs defaultValue={editingQuotation?.is_lump_sum ? "lumpsum" : "itemized"} className="mt-4">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="itemized">Itemized</TabsTrigger>
                  <TabsTrigger value="lumpsum">Lump Sum</TabsTrigger>
                </TabsList>
                <TabsContent value="itemized" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Client</Label>
                      <Select value={clientId} onValueChange={setClientId}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                        <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Pipe Type</Label>
                      <Select value={pipeType} onValueChange={setPipeType}><SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="hdpe">HDPE</SelectItem><SelectItem value="pvc">PVC</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Profit Margin (%)</Label><Input type="number" value={profitMargin} onChange={(e) => setProfitMargin(Number(e.target.value))} /></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><Label className="text-sm font-semibold">Line Items</Label>
                      <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
                    </div>
                    {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No items added.</p>}
                    {items.map((item) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-12 sm:col-span-4 space-y-1"><Label className="text-xs">Description</Label><Input placeholder="HDPE Pipe 110mm" value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} /></div>
                        <div className="col-span-4 sm:col-span-2 space-y-1"><Label className="text-xs">Type</Label>
                          <Select value={item.type} onValueChange={(v) => updateItem(item.id, "type", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="pipe">Pipe</SelectItem><SelectItem value="fitting">Fitting</SelectItem><SelectItem value="labor">Labor</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3 sm:col-span-2 space-y-1"><Label className="text-xs">Qty</Label><Input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))} /></div>
                        <div className="col-span-4 sm:col-span-2 space-y-1"><Label className="text-xs">Unit ₦</Label><Input type="number" value={item.unitPrice} onChange={(e) => updateItem(item.id, "unitPrice", Number(e.target.value))} /></div>
                        <div className="col-span-1"><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}><Trash2 className="h-3 w-3" /></Button></div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Labor (₦/m)</Label><Input type="number" value={laborCost} onChange={(e) => setLaborCost(Number(e.target.value))} /></div>
                    <div className="space-y-2"><Label>Transport (₦)</Label><Input type="number" value={transportCost} onChange={(e) => setTransportCost(Number(e.target.value))} /></div>
                  </div>
                  <QuotationSummary
                    subtotal={subtotal}
                    laborTotal={laborTotal}
                    transportCost={transportCost}
                    profitMargin={profitMargin}
                    profitAmount={profitAmount}
                    grandTotal={grandTotal}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                    <Button variant="secondary" onClick={() => handleSave("draft")} disabled={saving}>Save Draft</Button>
                    <Button onClick={() => handleSave("sent")} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save & Send</Button>
                  </div>
                </TabsContent>
                <TabsContent value="lumpsum" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Client</Label>
                      <Select value={clientId} onValueChange={setClientId}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                        <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Amount (₦)</Label><Input type="number" placeholder="0" value={lumpSumAmount} onChange={(e) => setLumpSumAmount(e.target.value)} /></div>
                  </div>
                  <div className="space-y-2"><Label>Description</Label>
                    <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]" placeholder="Scope..." value={lumpSumDesc} onChange={(e) => setLumpSumDesc(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                    <Button onClick={handleSaveLumpSum} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleteTarget?.quotation_number}?</AlertDialogTitle>
          <AlertDialogDescription>This will also delete all line items.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search quotations..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div ref={listRef} className="space-y-3">
        {filtered.length === 0 && (
          <Card className="border-border/50"><CardContent className="py-8 text-center text-muted-foreground">
            {quotations.length === 0 ? "No quotations yet." : "No matches."}
          </CardContent></Card>
        )}
        {filtered.map((q: any) => (
          <QuotationCard
            key={q.id}
            quotation={q}
            canEdit={canEdit}
            canDelete={canDelete}
            statusVariant={statusVariant}
            allStatuses={allQStatuses}
            onEdit={() => openEditQuotation(q)}
            onPrint={() => handlePrint(q)}
            onDelete={() => setDeleteTarget(q)}
            onStatusChange={(s) => handleStatusChange(q.id, s)}
          />
        ))}
      </div>
    </div>
  );
};

export default Quotations;
