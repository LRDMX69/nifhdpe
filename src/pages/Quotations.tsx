import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { QuotationCard } from "@/components/quotations/QuotationCard";
import { QuotationSummary } from "@/components/quotations/QuotationSummary";
import { AuditHistoryDialog } from "@/components/AuditHistoryDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Search, Trash2, Loader2, MoreVertical, Pencil, Download, ShoppingCart, CheckCircle2, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkflowBanner } from "@/components/ui/workflow-banner";
import { AsyncBoundary } from "@/components/ui/async-boundary";
import { useGsapStagger } from "@/hooks/useGsapAnimation";
import { formatCurrency, isFinanceCapable } from "@/lib/constants";
import { AiInsightPanel } from "@/components/AiInsightPanel";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { humanizeError } from "@/lib/humanizeError";
import { exportCsv, csvDate } from "@/lib/exportCsv";
import { industrialDb } from "@/lib/industrialDb";
import { calculateQuotationTotals } from "@/lib/financialMath";

type DbQuotation = Database["public"]["Tables"]["quotations"]["Row"] & { clients?: { name: string } | null, quotation_items?: { count: number }[], opportunity_id?: string | null, discount_amount?: number | null, tax_amount?: number | null, overhead_amount?: number | null, payment_terms?: string | null, terms_and_conditions?: string | null, exclusions?: string | null, assumptions?: string | null, site_reference?: string | null, currency?: string | null };
type DbQuotationItem = Database["public"]["Tables"]["quotation_items"]["Row"];
type DbClient = { id: string; name: string };
type QuotationSalesOrder = { id: string; order_number: string; quotation_id: string | null; status: string; total_amount: number | null; project_id: string | null };
type QuotationProforma = { id: string; proforma_number: string; client_id: string | null; quotation_id: string | null; invoice_id: string | null; status: string; total_amount: number | null; valid_until: string | null; issue_date: string; currency: string | null };
type QuotationProductSpecification = {
  id: string;
  product_code: string;
  product_name: string;
  category: string;
  material_grade?: string | null;
  pe_grade?: string | null;
  sdr?: string | null;
  pressure_class?: string | null;
  diameter_mm?: number | null;
  dimensions?: string | null;
  unit?: string | null;
  standard?: string | null;
  manufacturer?: string | null;
  application?: string | null;
  is_active?: boolean | null;
};

interface QuotationItem {
  id: string; description: string; type: string; quantity: number; unitPrice: number; total: number;
  productSpecificationId?: string;
  diameterMm?: number; lengthMeters?: number;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary", sent: "outline", accepted: "default", rejected: "destructive",
};
const allQStatuses = ["draft", "sent", "accepted", "rejected"];

const PRODUCT_CATEGORIES = ["hdpe_pipe", "hdpe_fitting", "equipment", "accessory", "service", "other"];

function ProductCataloguePanel({ orgId, canManage, products, onRefresh }: { orgId: string | undefined; canManage: boolean; products: QuotationProductSpecification[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ product_code: "", product_name: "", category: "hdpe_pipe", pe_grade: "", sdr: "", pressure_class: "", diameter_mm: "", dimensions: "", unit: "m", standard: "", manufacturer: "", application: "" });
  const setField = (field: keyof typeof form, value: string) => setForm((state) => ({ ...state, [field]: value }));

  const save = async () => {
    if (!orgId || !form.product_code.trim() || !form.product_name.trim()) return;
    setSaving(true);
    try {
      const { error } = await industrialDb.from("product_specifications").insert({
        organization_id: orgId,
        product_code: form.product_code.trim(),
        product_name: form.product_name.trim(),
        category: form.category,
        pe_grade: form.pe_grade.trim() || null,
        sdr: form.sdr.trim() || null,
        pressure_class: form.pressure_class.trim() || null,
        diameter_mm: form.diameter_mm ? Number(form.diameter_mm) : null,
        dimensions: form.dimensions.trim() || null,
        unit: form.unit.trim() || "m",
        standard: form.standard.trim() || null,
        manufacturer: form.manufacturer.trim() || null,
        application: form.application.trim() || null,
        is_active: true,
      });
      if (error) throw error;
      toast({ title: "Specification added", description: "The approved catalogue record is now available in quotation line items." });
      setForm({ product_code: "", product_name: "", category: "hdpe_pipe", pe_grade: "", sdr: "", pressure_class: "", diameter_mm: "", dimensions: "", unit: "m", standard: "", manufacturer: "", application: "" });
      setDialogOpen(false);
      onRefresh();
    } catch (error) {
      toast({ title: "Could not add specification", description: humanizeError(error), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const toggleActive = async (product: QuotationProductSpecification) => {
    const { error } = await industrialDb.from("product_specifications").update({ is_active: product.is_active === false }).eq("id", product.id).eq("organization_id", orgId);
    if (error) toast({ title: "Could not update specification", description: humanizeError(error), variant: "destructive" });
    else { toast({ title: product.is_active === false ? "Specification activated" : "Specification archived" }); onRefresh(); }
  };

  return <Card className="border-primary/20 bg-primary/5">
    <CardContent className="p-4 sm:p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0"><p className="text-sm font-semibold">HDPE Product Catalogue</p><p className="text-xs text-muted-foreground">Controlled specifications used by quotation lines, procurement, inventory, and traceability. Commercial teams select records here; they do not re-key technical attributes.</p></div>
        {canManage && <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogTrigger asChild><Button size="sm" variant="outline" className="shrink-0"><Plus className="h-3.5 w-3.5 mr-1" /> Add specification</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Add HDPE product specification</DialogTitle></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label>Product code *</Label><Input value={form.product_code} onChange={(e) => setField("product_code", e.target.value)} placeholder="NIF-PE100-110-SDR11" /></div><div className="space-y-1"><Label>Product name *</Label><Input value={form.product_name} onChange={(e) => setField("product_name", e.target.value)} placeholder="Approved commercial name" /></div><div className="space-y-1"><Label>Category</Label><Select value={form.category} onValueChange={(v) => setField("category", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRODUCT_CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Unit</Label><Input value={form.unit} onChange={(e) => setField("unit", e.target.value)} placeholder="m, roll, each" /></div><div className="space-y-1"><Label>PE/material grade</Label><Input value={form.pe_grade} onChange={(e) => setField("pe_grade", e.target.value)} /></div><div className="space-y-1"><Label>SDR</Label><Input value={form.sdr} onChange={(e) => setField("sdr", e.target.value)} /></div><div className="space-y-1"><Label>Pressure class</Label><Input value={form.pressure_class} onChange={(e) => setField("pressure_class", e.target.value)} /></div><div className="space-y-1"><Label>Diameter (mm)</Label><Input type="number" min="0" value={form.diameter_mm} onChange={(e) => setField("diameter_mm", e.target.value)} /></div><div className="space-y-1"><Label>Dimensions</Label><Input value={form.dimensions} onChange={(e) => setField("dimensions", e.target.value)} /></div><div className="space-y-1"><Label>Applicable standard</Label><Input value={form.standard} onChange={(e) => setField("standard", e.target.value)} placeholder="Only enter an approved value" /></div><div className="space-y-1"><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={(e) => setField("manufacturer", e.target.value)} /></div><div className="space-y-1"><Label>Application</Label><Input value={form.application} onChange={(e) => setField("application", e.target.value)} /></div></div><Button onClick={save} disabled={saving || !form.product_code.trim() || !form.product_name.trim()}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save specification</Button></DialogContent></Dialog>}
      </div>
      {products.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">No specifications are available yet. Add approved product data before creating itemized quotations.</p> : <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <div key={product.id} className="rounded-lg border bg-background/70 p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-semibold break-words-safe">{product.product_code} · {product.product_name}</p><p className="text-[11px] text-muted-foreground capitalize">{product.category.replace("_", " ")} · {product.pe_grade ?? "grade not configured"}{product.diameter_mm ? ` · ${product.diameter_mm} mm` : ""}</p></div><Badge variant={product.is_active === false ? "secondary" : "default"} className="shrink-0 text-[10px]">{product.is_active === false ? "archived" : "active"}</Badge></div><p className="mt-2 text-[11px] text-muted-foreground break-words-safe">{product.standard ?? "Standard not configured"}{product.sdr ? ` · SDR ${product.sdr}` : ""}{product.pressure_class ? ` · ${product.pressure_class}` : ""}</p>{canManage && <Button size="sm" variant="ghost" className="mt-2 h-7 px-2 text-[11px]" onClick={() => toggleActive(product)}>{product.is_active === false ? "Activate" : "Archive"}</Button>}</div>)}</div>}
    </CardContent>
  </Card>;
}

const Quotations = () => {
  const { user, memberships, activeRole, isMaintenance } = useAuth();
  const [searchParams] = useSearchParams();
  const [catalogueOpen, setCatalogueOpen] = useState(() => searchParams.get("section") === "products");
  const [proformaOpen, setProformaOpen] = useState(false);
  const [proformaQuotationId, setProformaQuotationId] = useState("");
  const [proformaValidUntil, setProformaValidUntil] = useState("");
  const [proformaNotes, setProformaNotes] = useState("");
  const { toast } = useToast();
  const orgId = memberships[0]?.organization_id;
  const canEdit = activeRole === "administrator" || activeRole === "reception_sales" || isFinanceCapable(activeRole) || isMaintenance;
  const canDelete = activeRole === "administrator" || isMaintenance;
  const canViewHistory = activeRole === "administrator" || isFinanceCapable(activeRole) || isMaintenance;
  const canManageProductSpecifications = isMaintenance || ["administrator", "engineer", "reception_sales", "warehouse"].includes(activeRole ?? "");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DbQuotation | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [pipeType, setPipeType] = useState("hdpe");
  const [profitMargin, setProfitMargin] = useState(15);
  const [laborCost, setLaborCost] = useState(500);
  const [transportCost, setTransportCost] = useState(50000);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [overheadAmount, setOverheadAmount] = useState(0);
  const [taxPct, setTaxPct] = useState(0);
  const [siteReference, setSiteReference] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [assumptions, setAssumptions] = useState("");
  const [clientId, setClientId] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const [lumpSumAmount, setLumpSumAmount] = useState("");
  const [lumpSumDesc, setLumpSumDesc] = useState("");
  const [editingQuotation, setEditingQuotation] = useState<DbQuotation | null>(null);
  const [historyTarget, setHistoryTarget] = useState<DbQuotation | null>(null);
  const [revisionReason, setRevisionReason] = useState("");
  const listRef = useGsapStagger(".gsap-card", 0.06);

  const { data: quotations = [], isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["quotations", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from("quotations").select("*, clients(name), quotation_items(count)").eq("organization_id", orgId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as DbQuotation[]) ?? [];
    },
    enabled: !!orgId,
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ["opportunities-for-quotation", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from("opportunities").select("id, title").eq("organization_id", orgId).order("title");
      if (error) throw error;
      return (data ?? []) as { id: string; title: string }[];
    },
    enabled: !!orgId,
  });

  const { data: salesOrders = [], refetch: refetchSalesOrders } = useQuery({
    queryKey: ["sales-orders-for-quotations", orgId],
    queryFn: async () => {
      if (!orgId) return [] as QuotationSalesOrder[];
      const { data, error } = await industrialDb.from("sales_orders").select("id, order_number, quotation_id, status, total_amount, project_id").eq("organization_id", orgId).neq("status", "cancelled").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as QuotationSalesOrder[];
    },
    enabled: !!orgId,
  });

  const { data: proformas = [], refetch: refetchProformas } = useQuery({
    queryKey: ["proformas-for-quotations", orgId],
    queryFn: async () => {
      if (!orgId) return [] as QuotationProforma[];
      const { data, error } = await industrialDb.from("proforma_invoices").select("id, proforma_number, client_id, quotation_id, invoice_id, status, total_amount, valid_until, issue_date, currency").eq("organization_id", orgId).order("issue_date", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as QuotationProforma[];
    },
    enabled: !!orgId,
  });

  const { data: productSpecifications = [], refetch: refetchProductSpecifications } = useQuery({
    queryKey: ["product-specifications-for-quotation", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await industrialDb.from("product_specifications").select("id, product_code, product_name, category, material_grade, pe_grade, sdr, pressure_class, diameter_mm, dimensions, unit, standard, manufacturer, application, is_active").eq("organization_id", orgId).order("product_code");
      if (error) throw error;
      return (data ?? []) as QuotationProductSpecification[];
    },
    enabled: !!orgId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-quotation", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from("clients").select("id, name").eq("organization_id", orgId).order("name");
      if (error) throw error;
      return (data as DbClient[]) ?? [];
    },
    enabled: !!orgId,
  });

  const addItem = () => setItems([...items, { id: Date.now().toString(), description: "", type: "pipe", quantity: 1, unitPrice: 0, total: 0, productSpecificationId: "" }]);
  const updateItem = (id: string, field: string, value: string | number) => {
    setItems((currentItems) => currentItems.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      updated.total = updated.quantity * updated.unitPrice;
      return updated;
    }));
  };
  const removeItem = (id: string) => setItems(items.filter((i) => i.id !== id));

  const quotationTotals = calculateQuotationTotals({ items, laborUnits: items.filter((i) => i.type === "pipe").reduce((s, i) => s + i.quantity, 0), laborRate: laborCost, transportCost, profitMarginPercent: profitMargin, discountAmount, overheadAmount, taxRatePercent: taxPct });
  const { subtotal, laborTotal, profitAmount, discount, taxableTotal, taxAmount, grandTotal } = quotationTotals;

  const resetForm = () => {
    setItems([]); setClientId(""); setOpportunityId(""); setPipeType("hdpe"); setProfitMargin(15);
    setLaborCost(500); setTransportCost(50000); setDiscountAmount(0); setOverheadAmount(0); setTaxPct(0); setSiteReference(""); setPaymentTerms(""); setTermsAndConditions(""); setExclusions(""); setAssumptions(""); setEditingQuotation(null);
    setLumpSumAmount(""); setLumpSumDesc(""); setRevisionReason("");
  };

  /** Load existing quotation for editing */
  const openEditQuotation = async (q: DbQuotation) => {
    setEditingQuotation(q);
    setClientId(q.client_id ?? "");
    setOpportunityId((q as DbQuotation & { opportunity_id?: string | null }).opportunity_id ?? "");
    setPipeType(q.pipe_type ?? "hdpe");
    setProfitMargin(q.profit_margin_percent ?? 15);
    setLaborCost(q.labor_cost_per_meter ?? 500);
    setTransportCost(q.transport_cost ?? 50000);
    setDiscountAmount(q.discount_amount ?? 0);
    setOverheadAmount(q.overhead_amount ?? 0);
    setTaxPct(q.tax_amount && q.total_amount ? (q.tax_amount / Math.max(1, Number(q.total_amount) - Number(q.tax_amount))) * 100 : 0);
    setSiteReference(q.site_reference ?? "");
    setPaymentTerms(q.payment_terms ?? "");
    setTermsAndConditions(q.terms_and_conditions ?? "");
    setExclusions(q.exclusions ?? "");
    setAssumptions(q.assumptions ?? "");

    if (q.is_lump_sum) {
      setLumpSumAmount(q.lump_sum_amount?.toString() ?? "");
      setLumpSumDesc(q.notes ?? "");
    } else {
      // Load line items
      const { data: lineItems, error: lineItemsError } = await supabase.from("quotation_items").select("*").eq("quotation_id", q.id);
      if (lineItemsError) {
        toast({ title: "Could not load quotation items", description: humanizeError(lineItemsError), variant: "destructive" });
        return;
      }
      if (lineItems) {
        setItems((lineItems as DbQuotationItem[]).map((li) => ({
          id: li.id,
          description: li.description,
          type: li.item_type,
          quantity: li.quantity,
          unitPrice: li.unit_price,
          total: li.total_price,
          productSpecificationId: (li as DbQuotationItem & { product_specification_id?: string | null }).product_specification_id ?? "",
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
        if (!revisionReason.trim()) throw new Error("A reason is required when editing an existing quotation.");
        const { data: previousQuotation } = await supabase.from("quotations").select("*, quotation_items(*)").eq("id", editingQuotation.id).single();
        const { error: revisionError } = await industrialDb.rpc("create_document_revision", {
          _org_id: orgId, _entity_type: "quotation", _entity_id: editingQuotation.id,
          _snapshot: previousQuotation ?? editingQuotation, _reason: revisionReason.trim(),
        });
        if (revisionError) throw revisionError;
        // Update existing after preserving the historical snapshot.
        const { error } = await industrialDb.from("quotations").update({
          client_id: clientId || null, opportunity_id: opportunityId || null, pipe_type: pipeType as Database["public"]["Enums"]["pipe_type"],
          profit_margin_percent: profitMargin, labor_cost_per_meter: laborCost,
          transport_cost: transportCost, subtotal, discount_amount: discount, overhead_amount: overheadAmount, tax_amount: taxAmount, total_amount: grandTotal, payment_terms: paymentTerms || null, terms_and_conditions: termsAndConditions || null, exclusions: exclusions || null, assumptions: assumptions || null, site_reference: siteReference || null, status: status as Database["public"]["Enums"]["quotation_status"], is_lump_sum: false,
          revision_reason: revisionReason || null,
        } as Database["public"]["Tables"]["quotations"]["Update"]).eq("id", editingQuotation.id);
        if (error) throw error;
        // Replace line items. Errors here must NOT be swallowed: a header
        // saved without its items would silently corrupt the quotation.
        const { error: delItemsError } = await supabase.from("quotation_items").delete().eq("quotation_id", editingQuotation.id);
        if (delItemsError) throw delItemsError;
        if (items.length > 0) {
          const { error: insItemsError } = await supabase.from("quotation_items").insert(items.map(i => ({
            quotation_id: editingQuotation.id, description: i.description, item_type: i.type as Database["public"]["Enums"]["quotation_item_type"],
            quantity: i.quantity, unit_price: i.unitPrice, total_price: i.total, product_specification_id: i.productSpecificationId || null,
          })));
          if (insItemsError) throw insItemsError;
        }
        toast({ title: "Quotation updated" });
      } else {
        const { data: qNumRpc } = await supabase.rpc("next_doc_number", { _org_id: orgId, _doc_type: "quotations" });
        const qNum = qNumRpc ?? `QT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
        const { data: quotation, error } = await industrialDb.from("quotations").insert({
          organization_id: orgId, created_by: user.id, client_id: clientId || null, opportunity_id: opportunityId || null, quotation_number: qNum,
          pipe_type: pipeType as Database["public"]["Enums"]["pipe_type"], profit_margin_percent: profitMargin, labor_cost_per_meter: laborCost,
          transport_cost: transportCost, subtotal, discount_amount: discount, overhead_amount: overheadAmount, tax_amount: taxAmount, total_amount: grandTotal, payment_terms: paymentTerms || null, terms_and_conditions: termsAndConditions || null, exclusions: exclusions || null, assumptions: assumptions || null, site_reference: siteReference || null, status: status as Database["public"]["Enums"]["quotation_status"], is_lump_sum: false,
        } as Database["public"]["Tables"]["quotations"]["Insert"]).select().single();
        if (error) throw error;
        if (items.length > 0 && quotation) {
          const { error: itemError } = await industrialDb.from("quotation_items").insert(items.map(i => ({
            quotation_id: quotation.id, description: i.description, item_type: i.type as Database["public"]["Enums"]["quotation_item_type"],
            quantity: i.quantity, unit_price: i.unitPrice, total_price: i.total, product_specification_id: i.productSpecificationId || null,
          })));
          if (itemError) throw itemError;
        }
        toast({ title: status === "draft" ? "Saved as draft" : "Quotation sent" });
      }
      resetForm(); setDialogOpen(false); refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save quotation";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleSaveLumpSum = async () => {
    if (!orgId || !user || !lumpSumAmount) return;
    setSaving(true);
    try {
      if (editingQuotation) {
        if (!revisionReason.trim()) throw new Error("A reason is required when editing an existing quotation.");
        const { data: previousQuotation } = await supabase.from("quotations").select("*, quotation_items(*)").eq("id", editingQuotation.id).single();
        const { error: revisionError } = await industrialDb.rpc("create_document_revision", {
          _org_id: orgId, _entity_type: "quotation", _entity_id: editingQuotation.id,
          _snapshot: previousQuotation ?? editingQuotation, _reason: revisionReason.trim(),
        });
        if (revisionError) throw revisionError;
        const { error } = await industrialDb.from("quotations").update({
          client_id: clientId || null, opportunity_id: opportunityId || null, is_lump_sum: true,
          lump_sum_amount: parseFloat(lumpSumAmount), subtotal: parseFloat(lumpSumAmount), discount_amount: discountAmount, overhead_amount: overheadAmount, tax_amount: taxAmount, total_amount: parseFloat(lumpSumAmount),
          payment_terms: paymentTerms || null, terms_and_conditions: termsAndConditions || null, exclusions: exclusions || null, assumptions: assumptions || null, site_reference: siteReference || null, notes: lumpSumDesc || null, revision_reason: revisionReason || null,
        } as Database["public"]["Tables"]["quotations"]["Update"]).eq("id", editingQuotation.id);
        if (error) throw error;
        toast({ title: "Quotation updated" });
      } else {
        const { data: qNumRpc } = await supabase.rpc("next_doc_number", { _org_id: orgId, _doc_type: "quotations" });
        const qNum = qNumRpc ?? `QT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
        const { error } = await supabase.from("quotations").insert({
          organization_id: orgId, created_by: user.id, client_id: clientId || null, quotation_number: qNum,
          is_lump_sum: true, lump_sum_amount: parseFloat(lumpSumAmount), subtotal: parseFloat(lumpSumAmount), discount_amount: discountAmount, overhead_amount: overheadAmount, tax_amount: taxAmount, total_amount: parseFloat(lumpSumAmount),
          opportunity_id: opportunityId || null, payment_terms: paymentTerms || null, terms_and_conditions: termsAndConditions || null, exclusions: exclusions || null, assumptions: assumptions || null, site_reference: siteReference || null, notes: lumpSumDesc || null, status: "draft",
        } as Database["public"]["Tables"]["quotations"]["Insert"]);
        if (error) throw error;
        toast({ title: "Quotation saved" });
      }
      resetForm(); setDialogOpen(false); refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save quotation";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from("quotations").update({ status: status as Database["public"]["Enums"]["quotation_status"] }).eq("id", id);
      if (error) throw error;
      toast({ title: `Status → ${status}` });

      refetch();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error", description: humanizeError(error), variant: "destructive" });
    }
  };

  const createProforma = async () => {
    if (!orgId || !proformaQuotationId) return;
    setSaving(true);
    try {
      const { error } = await industrialDb.rpc("create_proforma_invoice_from_quotation", {
        _org_id: orgId,
        _quotation_id: proformaQuotationId,
        _valid_until: proformaValidUntil || null,
        _notes: proformaNotes.trim() || null,
        _idempotency_key: `quotation-proforma:${proformaQuotationId}`,
      });
      if (error) throw error;
      toast({ title: "Proforma invoice issued", description: "The full quotation data is linked and visible in this commercial workflow." });
      setProformaOpen(false); setProformaQuotationId(""); setProformaValidUntil(""); setProformaNotes("");
      await refetchProformas();
    } catch (error) {
      toast({ title: "Could not create proforma", description: humanizeError(error), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const decideProforma = async (proforma: QuotationProforma, decision: "accepted" | "cancelled") => {
    if (!orgId) return;
    setSaving(true);
    try {
      const { data, error } = await industrialDb.rpc("decide_proforma_invoice", {
        _org_id: orgId,
        _proforma_id: proforma.id,
        _decision: decision,
        _reason: decision === "accepted" ? "Client acceptance recorded in the commercial workflow" : "Proforma cancelled from the commercial workflow",
      });
      if (error) throw error;
      const converted = data as { invoice_id?: string | null } | null;
      toast({ title: decision === "accepted" ? "Proforma accepted" : "Proforma cancelled", description: decision === "accepted" && converted?.invoice_id ? "A linked final invoice was generated automatically." : undefined });
      await Promise.all([refetchProformas(), refetchSalesOrders(), refetch()]);
    } catch (error) {
      toast({ title: "Could not update proforma", description: humanizeError(error), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const createSalesOrder = async (q: DbQuotation) => {
    if (!orgId) return;
    setSaving(true);
    try {
      const { error } = await industrialDb.rpc("create_sales_order_from_quotation", { _org_id: orgId, _quotation_id: q.id, _notes: `Created from accepted quotation ${q.quotation_number}` });
      if (error) throw error;
      toast({ title: "Sales order created", description: `${q.quotation_number} is now in the order lifecycle.` });
      await Promise.all([refetchSalesOrders(), refetch()]);
    } catch (error) {
      toast({ title: "Could not create sales order", description: humanizeError(error), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const confirmSalesOrder = async (order: QuotationSalesOrder) => {
    if (!orgId) return;
    setSaving(true);
    try {
      const { error } = await industrialDb.rpc("confirm_sales_order", { _org_id: orgId, _order_id: order.id });
      if (error) throw error;
      toast({ title: "Sales order confirmed", description: "Stock reservations and procurement demand were evaluated atomically." });
      await refetchSalesOrders();
    } catch (error) {
      toast({ title: "Could not confirm sales order", description: humanizeError(error), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const createInvoiceFromSalesOrder = async (order: QuotationSalesOrder) => {
    if (!orgId) return;
    setSaving(true);
    try {
      const { error } = await industrialDb.rpc("create_invoice_from_sales_order", { _org_id: orgId, _order_id: order.id });
      if (error) throw error;
      toast({ title: "Invoice created", description: `${order.order_number} is now linked to finance.` });
    } catch (error) {
      toast({ title: "Could not create invoice", description: humanizeError(error), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleExport = () => {
    exportCsv(`quotations-${new Date().toISOString().slice(0, 10)}`, [
      { header: "Quotation #", value: (q: DbQuotation) => q.quotation_number },
      { header: "Client", value: (q: DbQuotation) => q.clients?.name ?? "" },
      { header: "Status", value: (q: DbQuotation) => q.status },
      { header: "Pipe Type", value: (q: DbQuotation) => q.pipe_type ?? "" },
      { header: "Total (₦)", value: (q: DbQuotation) => Number(q.total_amount ?? 0).toLocaleString() },
      { header: "Date", value: (q: DbQuotation) => csvDate(q.created_at) },
    ], quotations);
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
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error", description: humanizeError(error), variant: "destructive" });
    }
  };

  const handlePrint = async (q: DbQuotation) => {
    const { generatePdf } = await import("@/lib/generatePdf");
    // Fetch line items for table
    const { data: lineItems } = await supabase.from("quotation_items").select("*").eq("quotation_id", q.id);

    if (lineItems && lineItems.length > 0) {
      generatePdf({
        title: `Quotation ${q.quotation_number}`,
        contentSections: [
          { heading: "Client and project", bullets: [
            `Client: ${q.clients?.name ?? "N/A"}`,
            q.site_reference ? `Site / reference: ${q.site_reference}` : "",
            `Issued: ${new Date(q.created_at).toLocaleDateString()}`,
            `Status: ${q.status.toUpperCase()}`,
            q.valid_until ? `Valid until: ${q.valid_until}` : "",
          ].filter(Boolean) },
          { heading: "Commercial terms", bullets: [
            `Pipe type: ${q.pipe_type ?? "N/A"}`,
            q.payment_terms ? `Payment terms: ${q.payment_terms}` : "",
            q.assumptions ? `Assumptions: ${q.assumptions}` : "",
            q.exclusions ? `Exclusions: ${q.exclusions}` : "",
            q.terms_and_conditions ? `Terms: ${q.terms_and_conditions}` : "",
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
          rows: (lineItems as DbQuotationItem[]).map((li, idx: number) => ({
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
            ...(q.profit_margin_percent ? [{ label: `Profit (${q.profit_margin_percent}%)`, value: "Included" }] : []),
            ...(q.discount_amount ? [{ label: "Discount", value: `-${formatCurrency(q.discount_amount)}` }] : []),
            ...(q.overhead_amount ? [{ label: "Overhead / site cost", value: formatCurrency(q.overhead_amount) }] : []),
            ...(q.tax_amount ? [{ label: "Tax", value: formatCurrency(q.tax_amount) }] : []),
            { label: "Grand Total", value: formatCurrency(q.total_amount ?? 0) },
          ],
        },
        stampType: q.status === "accepted" ? "admin" : null,
        companyName: "NIF Technical Services",
        documentId: q.quotation_number,
        watermark: q.status === "accepted" ? "FINAL" : "DRAFT",
      });
    } else {
      // Lump sum or no items
      generatePdf({
        title: `Quotation ${q.quotation_number}`,
        contentSections: [{ heading: "Client and project", bullets: [`Client: ${q.clients?.name ?? "N/A"}`, q.site_reference ? `Site / reference: ${q.site_reference}` : "", `Status: ${q.status.toUpperCase()}`, `Issued: ${new Date(q.created_at).toLocaleDateString()}`].filter(Boolean) }, { heading: "Commercial summary", bullets: [`Grand total: ${formatCurrency(q.total_amount ?? 0)}`, q.payment_terms ? `Payment terms: ${q.payment_terms}` : "", q.assumptions ? `Assumptions: ${q.assumptions}` : "", q.exclusions ? `Exclusions: ${q.exclusions}` : "", q.terms_and_conditions ? `Terms: ${q.terms_and_conditions}` : "", q.notes ? `Notes: ${q.notes}` : ""].filter(Boolean) }],
        documentId: q.quotation_number,
        companyName: "NIF Technical Services",
        stampType: q.status === "accepted" ? "admin" : null,
        watermark: q.status === "accepted" ? "FINAL" : "DRAFT",
      });
    }
  };

  const filtered = quotations.filter(
    (q: DbQuotation) => q.quotation_number.toLowerCase().includes(search.toLowerCase()) || (q.clients?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const acceptedQuotations = quotations.filter((q) => q.status === "accepted");
  const canConfirmOrders = isMaintenance || ["administrator", "reception_sales", "finance"].includes(activeRole ?? "");
  const canCreateOrderInvoices = isMaintenance || ["administrator", "finance"].includes(activeRole ?? "");

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Quotations"
        description="Create and manage pipe quotations"
        executiveSummary={`${quotations.filter((q) => q.status === "sent").length} awaiting client · ${quotations.filter((q) => q.status === "accepted").length} accepted of ${quotations.length}`}
        lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
        onRefresh={() => { void refetch(); void refetchProformas(); void refetchSalesOrders(); }}
      >
        <Button size="sm" variant="outline" onClick={handleExport} disabled={quotations.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
        {canEdit && <Dialog open={proformaOpen} onOpenChange={setProformaOpen}><DialogTrigger asChild><Button size="sm" variant="outline"><ReceiptText className="h-3.5 w-3.5 mr-1" />Proforma</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create Proforma Invoice</DialogTitle></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Source quotation *</Label><Select value={proformaQuotationId} onValueChange={setProformaQuotationId}><SelectTrigger><SelectValue placeholder="Select quotation" /></SelectTrigger><SelectContent>{quotations.filter((quotation) => quotation.status !== "rejected").map((quotation) => <SelectItem key={quotation.id} value={quotation.id}>{quotation.quotation_number} · {quotation.clients?.name ?? "Client"} · {formatCurrency(Number(quotation.total_amount ?? 0))}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Valid until</Label><Input type="date" value={proformaValidUntil} onChange={(event) => setProformaValidUntil(event.target.value)} /></div><div className="space-y-2"><Label>Notes</Label><Textarea rows={3} value={proformaNotes} onChange={(event) => setProformaNotes(event.target.value)} placeholder="Commercial notes or conditions" /></div><Button onClick={createProforma} disabled={saving || !proformaQuotationId}>Create draft proforma</Button></div></DialogContent></Dialog>}
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Quotation</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingQuotation ? "Edit" : "Create New"} Quotation</DialogTitle></DialogHeader>
              {editingQuotation && (
                <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
                  <Label className="text-xs text-amber-700 dark:text-amber-400">Reason for change (recorded in history)</Label>
                  <Textarea rows={2} value={revisionReason} onChange={(e) => setRevisionReason(e.target.value)} placeholder="e.g. Client negotiated a 5% discount after site visit" className="text-sm" />
                </div>
              )}
              <Tabs defaultValue={editingQuotation?.is_lump_sum ? "lumpsum" : "itemized"} className="mt-4">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="itemized">Itemized</TabsTrigger>
                  <TabsTrigger value="lumpsum">Lump Sum</TabsTrigger>
                </TabsList>
                <TabsContent value="itemized" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Client</Label>
                      <Select value={clientId} onValueChange={setClientId}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                        <SelectContent>{clients.map((c: DbClient) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Opportunity</Label>
                      <Select value={opportunityId || "none"} onValueChange={(value) => setOpportunityId(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="Optional opportunity" /></SelectTrigger>
                        <SelectContent><SelectItem value="none">No opportunity link</SelectItem>{opportunities.map((opportunity) => <SelectItem key={opportunity.id} value={opportunity.id}>{opportunity.title}</SelectItem>)}</SelectContent>
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
                        <div className="col-span-12 sm:col-span-4 space-y-1"><Label className="text-xs">Product / Description</Label><Select value={item.productSpecificationId || "none"} onValueChange={(value) => { const product = productSpecifications.find((p) => p.id === value); setItems((currentItems) => currentItems.map((currentItem) => { if (currentItem.id !== item.id) return currentItem; const nextProductSpecificationId = value === "none" ? "" : value; const nextDescription = product && !currentItem.description ? `${product.product_code} — ${product.product_name}` : currentItem.description; return { ...currentItem, productSpecificationId: nextProductSpecificationId, description: nextDescription, total: currentItem.quantity * currentItem.unitPrice }; })); }}><SelectTrigger><SelectValue placeholder="Optional catalogue specification" /></SelectTrigger><SelectContent><SelectItem value="none">Free-text / unlinked</SelectItem>{productSpecifications.filter((product) => product.is_active !== false).map((product) => <SelectItem key={product.id} value={product.id}>{product.product_code} · {product.product_name}</SelectItem>)}</SelectContent></Select><Input placeholder="Description" value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} /></div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-2"><Label>Labor (₦/m)</Label><Input type="number" min="0" value={laborCost} onChange={(e) => setLaborCost(Number(e.target.value))} /></div>
                    <div className="space-y-2"><Label>Transport (₦)</Label><Input type="number" min="0" value={transportCost} onChange={(e) => setTransportCost(Number(e.target.value))} /></div>
                    <div className="space-y-2"><Label>Discount (₦)</Label><Input type="number" min="0" value={discountAmount} onChange={(e) => setDiscountAmount(Number(e.target.value))} /></div>
                    <div className="space-y-2"><Label>Overhead / site cost (₦)</Label><Input type="number" min="0" value={overheadAmount} onChange={(e) => setOverheadAmount(Number(e.target.value))} /></div>
                    <div className="space-y-2"><Label>Tax (%)</Label><Input type="number" min="0" value={taxPct} onChange={(e) => setTaxPct(Number(e.target.value))} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Site / project reference</Label><Input value={siteReference} onChange={(e) => setSiteReference(e.target.value)} placeholder="Site, BOQ, or client reference" /></div>
                    <div className="space-y-2"><Label>Payment terms</Label><Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. 30 days from invoice" /></div>
                    <div className="space-y-2"><Label>Assumptions</Label><Textarea rows={3} value={assumptions} onChange={(e) => setAssumptions(e.target.value)} placeholder="State measurable assumptions, access, quantities, or site conditions" /></div>
                    <div className="space-y-2"><Label>Exclusions</Label><Textarea rows={3} value={exclusions} onChange={(e) => setExclusions(e.target.value)} placeholder="State work, materials, taxes, or risks excluded" /></div>
                    <div className="space-y-2 sm:col-span-2"><Label>Terms and conditions</Label><Textarea rows={3} value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} placeholder="Acceptance, delivery, warranty, payment, and variation terms" /></div>
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
                        <SelectContent>{clients.map((c: DbClient) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Amount (₦)</Label><Input type="number" min="0" placeholder="0" value={lumpSumAmount} onChange={(e) => setLumpSumAmount(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Site / project reference</Label><Input value={siteReference} onChange={(e) => setSiteReference(e.target.value)} placeholder="Site or client reference" /></div>
                    <div className="space-y-2"><Label>Payment terms</Label><Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. 30 days" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><div className="space-y-2"><Label>Discount (₦)</Label><Input type="number" min="0" value={discountAmount} onChange={(e) => setDiscountAmount(Number(e.target.value))} /></div><div className="space-y-2"><Label>Overhead / site cost (₦)</Label><Input type="number" min="0" value={overheadAmount} onChange={(e) => setOverheadAmount(Number(e.target.value))} /></div><div className="space-y-2"><Label>Tax (%)</Label><Input type="number" min="0" value={taxPct} onChange={(e) => setTaxPct(Number(e.target.value))} /></div></div>
                  <div className="space-y-2"><Label>Description</Label>
                    <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]" placeholder="Scope..." value={lumpSumDesc} onChange={(e) => setLumpSumDesc(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="space-y-2"><Label>Assumptions</Label><Textarea rows={3} value={assumptions} onChange={(e) => setAssumptions(e.target.value)} placeholder="Scope assumptions" /></div><div className="space-y-2"><Label>Exclusions</Label><Textarea rows={3} value={exclusions} onChange={(e) => setExclusions(e.target.value)} placeholder="Scope exclusions" /></div><div className="space-y-2 sm:col-span-2"><Label>Terms and conditions</Label><Textarea rows={3} value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} placeholder="Acceptance, delivery, warranty, and payment terms" /></div></div>
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

      <WorkflowBanner
        storageKey="quotations"
        summary="Quotations are formal price offers to clients. Save as Draft while you fine-tune, Send when ready, create a controlled sales order after acceptance, and pass the confirmed order into delivery and finance without re-keying."
        steps={[
          { actor: "Marketing / Admin", action: "select an existing client and build an itemized or lump-sum quotation." },
          { actor: "Client", action: "reviews the quotation PDF; status moves through Sent → Accepted or Rejected." },
          { actor: "Finance", action: "confirms the sales-order state and creates the linked invoice once the order is ready for billing." },
        ]}
      />

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-3">
        <div className="min-w-0"><p className="text-sm font-medium">Technical specifications</p><p className="text-xs text-muted-foreground">Select and maintain approved HDPE catalogue records inside the quotation workflow.</p></div>
        <Button size="sm" variant="outline" onClick={() => setCatalogueOpen((open) => !open)}>{catalogueOpen ? "Hide catalogue" : "Open catalogue"}</Button>
      </div>
      {catalogueOpen && <ProductCataloguePanel orgId={orgId} canManage={canManageProductSpecifications} products={productSpecifications} onRefresh={() => { void refetchProductSpecifications(); }} />}

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

      {acceptedQuotations.length > 0 && <Card className="border-primary/20 bg-primary/5"><CardContent className="p-4 space-y-3"><div><p className="text-sm font-semibold">Commercial order lifecycle</p><p className="text-xs text-muted-foreground">Accepted quotations become controlled sales orders. Confirmation evaluates stock reservations and shortages; finance can then create the linked invoice.</p></div><div className="space-y-2">{acceptedQuotations.map((quotation) => { const order = salesOrders.find((candidate) => candidate.quotation_id === quotation.id); return <div key={quotation.id} className="flex flex-col gap-3 rounded-lg border bg-background/70 p-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><p className="text-sm font-medium">{quotation.quotation_number} · {quotation.clients?.name ?? "Client"}</p><p className="text-xs text-muted-foreground">{formatCurrency(Number(quotation.total_amount ?? 0))} · {order ? `${order.order_number} · ${order.status.replace("_", " ")}` : "No sales order yet"}</p></div><div className="flex flex-wrap gap-2">{!order && canEdit && <Button size="sm" variant="outline" onClick={() => createSalesOrder(quotation)} disabled={saving}><ShoppingCart className="h-3.5 w-3.5 mr-1" />Create sales order</Button>}{order && order.status === "draft" && canConfirmOrders && <Button size="sm" variant="outline" onClick={() => confirmSalesOrder(order)} disabled={saving}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Confirm order</Button>}{order && ["confirmed", "partially_fulfilled", "fulfilled"].includes(order.status) && canCreateOrderInvoices && <Button size="sm" onClick={() => createInvoiceFromSalesOrder(order)} disabled={saving}><ReceiptText className="h-3.5 w-3.5 mr-1" />Create linked invoice</Button>}</div></div>; })}</div></CardContent></Card>}

      {proformas.length > 0 && <Card className="border-amber-500/30 bg-amber-500/5"><CardContent className="p-4 space-y-3"><div><p className="text-sm font-semibold">Proforma and final-invoice lifecycle</p><p className="text-xs text-muted-foreground">Every proforma remains linked to its quotation. Recording acceptance generates one final invoice atomically; repeated clicks return the same linked result.</p></div><div className="space-y-2">{proformas.map((proforma) => { const quotation = quotations.find((candidate) => candidate.id === proforma.quotation_id); return <div key={proforma.id} className="flex flex-col gap-3 rounded-lg border bg-background/70 p-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{proforma.proforma_number} · {quotation?.clients?.name ?? "Client"}</p><Badge variant={proforma.status === "accepted" ? "default" : proforma.status === "cancelled" ? "destructive" : "outline"} className="capitalize">{proforma.status}</Badge></div><p className="text-xs text-muted-foreground">{formatCurrency(Number(proforma.total_amount ?? 0))} · issued {proforma.issue_date}{proforma.valid_until ? ` · valid until ${proforma.valid_until}` : ""}{proforma.invoice_id ? ` · invoice linked ${proforma.invoice_id.slice(0, 8)}` : ""}</p></div><div className="flex flex-wrap gap-2">{["draft", "issued"].includes(proforma.status) && canEdit && <Button size="sm" onClick={() => decideProforma(proforma, "accepted")} disabled={saving}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Accept & create invoice</Button>}{["draft", "issued"].includes(proforma.status) && canEdit && <Button size="sm" variant="outline" onClick={() => decideProforma(proforma, "cancelled")} disabled={saving}>Cancel</Button>}{proforma.invoice_id && <Button size="sm" variant="outline" onClick={() => { window.location.assign(`/finance?tab=invoices`); }}>Open invoice</Button>}</div></div>; })}</div></CardContent></Card>}

      <AsyncBoundary
        loading={isLoading}
        error={error}
        onRetry={() => refetch()}
        isEmpty={filtered.length === 0}
        loadingVariant="list"
        loadingRows={4}
        emptyState={quotations.length === 0 ? {
          icon: FileText,
          title: "No quotations yet",
          description: "Quotations are the first step in the revenue cycle. Create one for an existing client — once accepted, create the linked sales order, confirm stock, and invoice from the controlled order lifecycle.",
          ownedBy: "Marketing / Sales & Administrators",
          action: canEdit ? { label: "New quotation", onClick: () => setDialogOpen(true) } : undefined,
        } : {
          icon: Search,
          title: "No quotations match your search",
          description: "Try a different reference or client name.",
          compact: true,
        }}
      >
      <div ref={listRef} className="space-y-3">
        {filtered.map((q: DbQuotation) => (
          <QuotationCard
            key={q.id}
            quotation={q}
            canEdit={canEdit}
            canDelete={canDelete}
            statusVariant={statusVariant}
            allStatuses={allQStatuses}
            onEdit={() => openEditQuotation(q)}
            onPrint={() => handlePrint(q)}
            onHistory={() => setHistoryTarget(q)}
            canViewHistory={canViewHistory}
            onDelete={() => setDeleteTarget(q)}
            onStatusChange={(s) => handleStatusChange(q.id, s)}
          />
        ))}
      </div>
      </AsyncBoundary>

      <AuditHistoryDialog
        open={!!historyTarget}
        onOpenChange={(o) => !o && setHistoryTarget(null)}
        tableName="quotations"
        recordId={historyTarget?.id ?? ""}
        orgId={orgId ?? ""}
        title={historyTarget ? `Revision History — ${historyTarget.quotation_number}` : undefined}
      />
    </div>
  );
};

export default Quotations;
