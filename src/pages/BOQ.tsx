import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, ArrowLeft, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AsyncBoundary } from "@/components/ui/async-boundary";
import { supabase as supa } from "@/integrations/supabase/client";
const supabase = supa as any;
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/constants";
import { humanizeError } from "@/lib/humanizeError";

type Boq = {
  id: string; title: string; description: string | null; status: string;
  total_amount: number; project_id: string | null; created_at: string;
  projects?: { name: string } | null;
};
type BoqItem = {
  id: string; boq_id: string; position: number; item_code: string | null;
  description: string; unit: string; quantity: number; rate: number; amount: number; notes: string | null;
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary", approved: "default", revised: "outline", archived: "destructive",
};

const BOQ = () => {
  const { memberships, activeRole, isMaintenance } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = memberships[0]?.organization_id;
  const canEdit = isMaintenance || ["administrator", "engineer", "reception_sales", "finance"].includes(activeRole ?? "");

  const [selected, setSelected] = useState<Boq | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", project_id: "" });

  const { data: boqs = [], isLoading, error, refetch } = useQuery({
    queryKey: ["boqs", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from("boqs").select("*, projects(name)").eq("organization_id", orgId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as Boq[]) ?? [];
    },
    enabled: !!orgId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["boq-projects", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("projects").select("id, name").eq("organization_id", orgId).order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
    enabled: !!orgId,
  });

  const handleCreate = async () => {
    if (!orgId || !form.title.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("boqs").insert({
        organization_id: orgId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        project_id: form.project_id || null,
        status: "draft",
      });
      if (error) throw error;
      toast({ title: "BOQ created" });
      setDialogOpen(false);
      setForm({ title: "", description: "", project_id: "" });
      refetch();
    } catch (e) {
      toast({ title: "Could not create BOQ", description: humanizeError(e), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this BOQ and all its items?")) return;
    const { error } = await supabase.from("boqs").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: humanizeError(error), variant: "destructive" }); return; }
    toast({ title: "BOQ deleted" });
    refetch();
  };

  if (selected) {
    return <BoqDetail boq={selected} onBack={() => { setSelected(null); qc.invalidateQueries({ queryKey: ["boqs", orgId] }); }} canEdit={canEdit} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Bills of Quantity" description="Itemised project quantities and rates with running totals.">
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> New BOQ</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create BOQ</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. HDPE Mainline Phase 1" /></div>
                <div>
                  <Label>Project (optional)</Label>
                  <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                    <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
                    <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={saving || !form.title.trim()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <AsyncBoundary loading={isLoading} error={error} isEmpty={boqs.length === 0} emptyState={{ title: "No BOQs yet", description: "Create one to begin." }}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boqs.map((b) => (
            <Card key={b.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelected(b)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-primary" /> {b.title}</CardTitle>
                  <Badge variant={statusVariant[b.status] ?? "secondary"}>{b.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {b.projects?.name && <p className="text-muted-foreground">Project: {b.projects.name}</p>}
                <p className="font-semibold text-primary">{formatCurrency(Number(b.total_amount) || 0)}</p>
                {canEdit && (
                  <Button size="sm" variant="ghost" className="text-destructive h-7 px-2 -ml-2" onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }}>
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </AsyncBoundary>
    </div>
  );
};

const BoqDetail = ({ boq, onBack, canEdit }: { boq: Boq; onBack: () => void; canEdit: boolean }) => {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [row, setRow] = useState({ item_code: "", description: "", unit: "m", quantity: "1", rate: "0", notes: "" });
  const [status, setStatus] = useState(boq.status);

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: ["boq-items", boq.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("boq_items").select("*").eq("boq_id", boq.id).order("position");
      if (error) throw error;
      return (data ?? []) as BoqItem[];
    },
  });

  const total = useMemo(() => items.reduce((s, i) => s + (Number(i.amount) || 0), 0), [items]);

  const syncTotal = async (newTotal: number) => {
    await supabase.from("boqs").update({ total_amount: newTotal }).eq("id", boq.id);
  };

  const handleAdd = async () => {
    const qty = parseFloat(row.quantity) || 0;
    const rate = parseFloat(row.rate) || 0;
    if (!row.description.trim() || qty <= 0) {
      toast({ title: "Description and quantity required", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      const nextPos = (items[items.length - 1]?.position ?? 0) + 1;
      const { error } = await supabase.from("boq_items").insert({
        boq_id: boq.id, organization_id: (boq as any).organization_id ?? null,
        position: nextPos, item_code: row.item_code.trim() || null,
        description: row.description.trim(), unit: row.unit.trim() || "ea",
        quantity: qty, rate, notes: row.notes.trim() || null,
      });
      if (error) throw error;
      setRow({ item_code: "", description: "", unit: "m", quantity: "1", rate: "0", notes: "" });
      const updated = total + qty * rate;
      await syncTotal(updated);
      refetch();
    } catch (e) {
      toast({ title: "Could not add item", description: humanizeError(e), variant: "destructive" });
    } finally { setAdding(false); }
  };

  const handleDelete = async (item: BoqItem) => {
    const { error } = await supabase.from("boq_items").delete().eq("id", item.id);
    if (error) { toast({ title: "Delete failed", variant: "destructive" }); return; }
    await syncTotal(total - Number(item.amount));
    refetch();
  };

  const handleStatus = async (newStatus: string) => {
    setStatus(newStatus);
    const { error } = await supabase.from("boqs").update({ status: newStatus }).eq("id", boq.id);
    if (error) toast({ title: "Status update failed", variant: "destructive" });
  };

  return (
    <div className="space-y-6">
      <PageHeader title={boq.title} description={boq.description ?? "Bill of Quantities detail"}>
        <Button variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
      </PageHeader>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Running Total</CardTitle>
            <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(total)}</p>
          </div>
          {canEdit && (
            <Select value={status} onValueChange={handleStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="revised">Revised</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          )}
        </CardHeader>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Add Item</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-6">
            <Input placeholder="Code" value={row.item_code} onChange={(e) => setRow({ ...row, item_code: e.target.value })} className="sm:col-span-1" />
            <Input placeholder="Description" value={row.description} onChange={(e) => setRow({ ...row, description: e.target.value })} className="sm:col-span-2" />
            <Input placeholder="Unit (m, ea)" value={row.unit} onChange={(e) => setRow({ ...row, unit: e.target.value })} />
            <Input type="number" placeholder="Qty" value={row.quantity} onChange={(e) => setRow({ ...row, quantity: e.target.value })} />
            <Input type="number" placeholder="Rate (₦)" value={row.rate} onChange={(e) => setRow({ ...row, rate: e.target.value })} />
            <Input placeholder="Notes" value={row.notes} onChange={(e) => setRow({ ...row, notes: e.target.value })} className="sm:col-span-5" />
            <Button onClick={handleAdd} disabled={adding} className="sm:col-span-1">{adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Add</>}</Button>
          </CardContent>
        </Card>
      )}

      <AsyncBoundary loading={isLoading} error={error} isEmpty={items.length === 0} emptyState={{ title: "No line items yet", description: "Add the first BOQ line above." }}>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="p-2 text-left">#</th>
                  <th className="p-2 text-left">Code</th>
                  <th className="p-2 text-left">Description</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-left">Unit</th>
                  <th className="p-2 text-right">Rate</th>
                  <th className="p-2 text-right">Amount</th>
                  {canEdit && <th className="p-2"></th>}
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="p-2">{i.position}</td>
                    <td className="p-2">{i.item_code ?? "—"}</td>
                    <td className="p-2">{i.description}{i.notes && <div className="text-xs text-muted-foreground">{i.notes}</div>}</td>
                    <td className="p-2 text-right">{Number(i.quantity).toLocaleString()}</td>
                    <td className="p-2">{i.unit}</td>
                    <td className="p-2 text-right">{formatCurrency(Number(i.rate))}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(Number(i.amount))}</td>
                    {canEdit && (
                      <td className="p-2 text-right">
                        <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => handleDelete(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </AsyncBoundary>
    </div>
  );
};

export default BOQ;