import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, FileText, Receipt as ReceiptIcon, Truck, ShoppingCart, ShieldAlert, Package, ClipboardList, AlertCircle, CreditCard } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/constants";

interface DocRow {
  id: string;
  number: string;
  type: string;
  date: string | null;
  party: string | null;
  amount: number | null;
  status: string | null;
}

const TYPE_META: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  invoice:   { label: "Invoice",        icon: FileText,      color: "text-blue-500" },
  quotation: { label: "Quotation",      icon: FileText,      color: "text-violet-500" },
  receipt:   { label: "Receipt",        icon: ReceiptIcon,   color: "text-emerald-500" },
  delivery:  { label: "Delivery/Waybill", icon: Truck,       color: "text-orange-500" },
  po:        { label: "Purchase Order", icon: ShoppingCart,  color: "text-cyan-500" },
  grn:       { label: "Goods Received", icon: Package,       color: "text-amber-500" },
  hse:       { label: "HSE Incident",   icon: ShieldAlert,   color: "text-red-500" },
  mr:        { label: "Material Req.",  icon: ClipboardList, color: "text-yellow-500" },
  claim:     { label: "Worker Claim",   icon: AlertCircle,   color: "text-pink-500" },
  payment:   { label: "Worker Payment", icon: CreditCard,    color: "text-indigo-500" },
};

const DocumentRegistry = () => {
  const { memberships } = useAuth();
  const orgId = memberships[0]?.organization_id;
  const [search, setSearch] = useState("");

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["doc-registry", orgId],
    queryFn: async (): Promise<DocRow[]> => {
      if (!orgId) return [];
      const [inv, quo, rcp, del, po, grn, hse, mr, clm, pay] = await Promise.all([
        supabase.from("invoices").select("id, document_number, invoice_date, total_amount, status, clients(name)").eq("organization_id", orgId).not("document_number", "is", null),
        supabase.from("quotations").select("id, quotation_number, created_at, total_amount, status, clients(name)").eq("organization_id", orgId),
        supabase.from("receipts").select("id, document_number, payment_date, amount_received, clients(name)").eq("organization_id", orgId).not("document_number", "is", null),
        supabase.from("deliveries").select("id, document_number, delivery_date, destination, status, cost").eq("organization_id", orgId).not("document_number", "is", null),
        supabase.from("purchase_orders").select("id, document_number, created_at, total_amount, status, vendor_name").eq("organization_id", orgId).not("document_number", "is", null),
        supabase.from("goods_received_notes").select("id, document_number, received_date, status, vendor_id").eq("organization_id", orgId).not("document_number", "is", null),
        supabase.from("hse_incidents").select("id, document_number, incident_date, type, severity, status").eq("organization_id", orgId).not("document_number", "is", null),
        supabase.from("material_requisitions").select("id, document_number, created_at, status").eq("organization_id", orgId).not("document_number", "is", null),
        supabase.from("worker_claims").select("id, document_number, created_at, amount, status, category").eq("organization_id", orgId).not("document_number", "is", null),
        supabase.from("worker_payments").select("id, document_number, date, amount, type").eq("organization_id", orgId).not("document_number", "is", null),
      ]);
      const rows: DocRow[] = [];
      (inv.data ?? []).forEach((r: any) => rows.push({ id: r.id, number: r.document_number, type: "invoice", date: r.invoice_date, party: r.clients?.name ?? null, amount: r.total_amount, status: r.status }));
      (quo.data ?? []).forEach((r: any) => rows.push({ id: r.id, number: r.quotation_number, type: "quotation", date: r.created_at, party: r.clients?.name ?? null, amount: r.total_amount, status: r.status }));
      (rcp.data ?? []).forEach((r: any) => rows.push({ id: r.id, number: r.document_number, type: "receipt", date: r.payment_date, party: r.clients?.name ?? null, amount: r.amount_received, status: "issued" }));
      (del.data ?? []).forEach((r: any) => rows.push({ id: r.id, number: r.document_number, type: "delivery", date: r.delivery_date, party: r.destination, amount: r.cost, status: r.status }));
      (po.data ?? []).forEach((r: any) => rows.push({ id: r.id, number: r.document_number, type: "po", date: r.created_at, party: r.vendor_name ?? null, amount: r.total_amount, status: r.status }));
      (grn.data ?? []).forEach((r: any) => rows.push({ id: r.id, number: r.document_number, type: "grn", date: r.received_date, party: null, amount: null, status: r.status }));
      (hse.data ?? []).forEach((r: any) => rows.push({ id: r.id, number: r.document_number, type: "hse", date: r.incident_date, party: r.type, amount: null, status: r.status }));
      (mr.data ?? []).forEach((r: any) => rows.push({ id: r.id, number: r.document_number, type: "mr", date: r.created_at, party: null, amount: null, status: r.status }));
      (clm.data ?? []).forEach((r: any) => rows.push({ id: r.id, number: r.document_number, type: "claim", date: r.created_at, party: r.category, amount: r.amount, status: r.status }));
      (pay.data ?? []).forEach((r: any) => rows.push({ id: r.id, number: r.document_number, type: "payment", date: r.date, party: r.type, amount: r.amount, status: "logged" }));
      return rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    },
    enabled: !!orgId,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return docs;
    const needle = search.toLowerCase();
    return docs.filter(d => (d.number ?? "").toLowerCase().includes(needle) || (d.party ?? "").toLowerCase().includes(needle) || d.type.includes(needle));
  }, [docs, search]);

  const grouped = useMemo(() => {
    const map: Record<string, DocRow[]> = {};
    for (const d of filtered) (map[d.type] ??= []).push(d);
    return map;
  }, [filtered]);

  const renderTable = (rows: DocRow[]) => (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground text-sm">No documents found.</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-[180px]">Reference</TableHead>
              <TableHead className="w-[120px]">Type</TableHead>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead>Party / Detail</TableHead>
              <TableHead className="text-right w-[140px]">Amount</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map(r => {
                const meta = TYPE_META[r.type] ?? { label: r.type, icon: FileText, color: "text-muted-foreground" };
                const Icon = meta.icon;
                return (
                  <TableRow key={`${r.type}-${r.id}`}>
                    <TableCell className="font-mono text-xs font-bold">{r.number}</TableCell>
                    <TableCell><span className="inline-flex items-center gap-1.5 text-xs"><Icon className={`h-3.5 w-3.5 ${meta.color}`} />{meta.label}</span></TableCell>
                    <TableCell className="text-xs">{r.date ? new Date(r.date).toLocaleDateString("en-NG") : "—"}</TableCell>
                    <TableCell className="text-xs max-w-[260px] truncate">{r.party ?? "—"}</TableCell>
                    <TableCell className="text-right text-xs font-medium">{r.amount != null ? formatCurrency(r.amount) : "—"}</TableCell>
                    <TableCell>{r.status ? <Badge variant="outline" className="capitalize text-[10px]">{r.status}</Badge> : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Document Registry" description="Every numbered document ever issued in the system — invoices, receipts, quotations, waybills, POs and more." />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by reference, client, vendor…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto bg-transparent p-0 gap-1 h-auto scrollbar-hide">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">All ({filtered.length})</TabsTrigger>
          {Object.entries(TYPE_META).map(([k, m]) => (
            <TabsTrigger key={k} value={k} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <m.icon className="h-3.5 w-3.5 mr-1" />{m.label} ({grouped[k]?.length ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all">{isLoading ? <p className="text-center text-muted-foreground py-10 text-sm">Loading…</p> : renderTable(filtered)}</TabsContent>
        {Object.keys(TYPE_META).map(k => (
          <TabsContent key={k} value={k}>{renderTable(grouped[k] ?? [])}</TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default DocumentRegistry;