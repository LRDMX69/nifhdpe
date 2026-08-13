import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { industrialDb, type IndustrialRow } from "@/lib/industrialDb";

const categories = ["hdpe_pipe", "hdpe_fitting", "equipment", "accessory", "service", "other"];

const ProductSpecifications = () => {
  const { memberships, activeRole, isMaintenance } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = memberships[0]?.organization_id;
  const canEdit = isMaintenance || ["administrator", "engineer", "reception_sales", "warehouse_manager"].includes(activeRole ?? "");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ product_code: "", product_name: "", category: "hdpe_pipe", material_grade: "", pe_grade: "", sdr: "", pressure_class: "", diameter_mm: "", dimensions: "", unit: "each", standard: "", manufacturer: "", application: "" });

  const products = useQuery({
    queryKey: ["product-specifications", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await industrialDb.from("product_specifications").select("*").eq("organization_id", orgId).order("product_code");
      if (error) throw error;
      return (data ?? []) as IndustrialRow[];
    },
  });

  const filtered = (products.data ?? []).filter((p) => `${p.product_code} ${p.product_name} ${p.category} ${p.standard ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (!orgId || !form.product_code.trim() || !form.product_name.trim()) return;
    setSaving(true);
    try {
      const { error } = await industrialDb.from("product_specifications").insert({
        organization_id: orgId, product_code: form.product_code.trim(), product_name: form.product_name.trim(), category: form.category,
        material_grade: form.material_grade || null, pe_grade: form.pe_grade || null, sdr: form.sdr || null, pressure_class: form.pressure_class || null,
        diameter_mm: form.diameter_mm ? Number(form.diameter_mm) : null, dimensions: form.dimensions || null, unit: form.unit || "each",
        standard: form.standard || null, manufacturer: form.manufacturer || null, application: form.application || null,
      });
      if (error) throw error;
      toast({ title: "Product specification saved", description: "No compliance or warranty claim was inferred; configure supporting certificates separately." });
      setForm({ product_code: "", product_name: "", category: "hdpe_pipe", material_grade: "", pe_grade: "", sdr: "", pressure_class: "", diameter_mm: "", dimensions: "", unit: "each", standard: "", manufacturer: "", application: "" });
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["product-specifications", orgId] });
    } catch (error) {
      toast({ title: "Could not save product", description: error instanceof Error ? error.message : "The database rejected the product.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return <div className="space-y-6">
    <PageHeader title="HDPE Product Specifications" description="Controlled product attributes for quotations, inventory, procurement, projects, and traceability.">{canEdit ? <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New specification</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>New product specification</DialogTitle></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div><Label>Product code *</Label><Input value={form.product_code} onChange={(e) => update("product_code", e.target.value)} placeholder="e.g. NIF-PE100-110-SDR11" /></div><div><Label>Product name *</Label><Input value={form.product_name} onChange={(e) => update("product_name", e.target.value)} placeholder="Use the approved commercial name" /></div><div><Label>Category</Label><Select value={form.category} onValueChange={(value) => update("category", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{item.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div><div><Label>Unit</Label><Input value={form.unit} onChange={(e) => update("unit", e.target.value)} placeholder="m, roll, each" /></div><div><Label>PE/material grade</Label><Input value={form.pe_grade} onChange={(e) => update("pe_grade", e.target.value)} placeholder="Awaiting approved value if unknown" /></div><div><Label>SDR</Label><Input value={form.sdr} onChange={(e) => update("sdr", e.target.value)} placeholder="Configurable" /></div><div><Label>Pressure class</Label><Input value={form.pressure_class} onChange={(e) => update("pressure_class", e.target.value)} placeholder="Configurable" /></div><div><Label>Diameter (mm)</Label><Input type="number" value={form.diameter_mm} onChange={(e) => update("diameter_mm", e.target.value)} /></div><div><Label>Dimensions</Label><Input value={form.dimensions} onChange={(e) => update("dimensions", e.target.value)} placeholder="Wall/length/other dimensions" /></div><div><Label>Applicable standard</Label><Input value={form.standard} onChange={(e) => update("standard", e.target.value)} placeholder="Do not claim compliance without evidence" /></div><div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={(e) => update("manufacturer", e.target.value)} /></div><div><Label>Application</Label><Input value={form.application} onChange={(e) => update("application", e.target.value)} placeholder="Water, industrial, irrigation, etc." /></div></div><Button onClick={save} disabled={saving || !form.product_code.trim() || !form.product_name.trim()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save specification</Button></DialogContent></Dialog> : undefined}</PageHeader>
    <Card><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="text-base">Product master</CardTitle><div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, name, standard…" /></div></div></CardHeader><CardContent>{products.isLoading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading product specifications…</div> : filtered.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No product specifications match this search. Add approved product data; do not use this page to invent standards.</div> : <div className="space-y-2">{filtered.map((p) => <div key={p.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{p.product_code} · {p.product_name}</p><p className="text-xs text-muted-foreground">{p.category} · {p.pe_grade ?? "grade not configured"} · {p.diameter_mm ? `${p.diameter_mm} mm` : "diameter not configured"} · {p.standard ?? "standard not configured"}</p></div><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "active" : "inactive"}</Badge></div>)}</div>}</CardContent></Card>
  </div>;
};

export default ProductSpecifications;
