import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkflowBanner } from "@/components/ui/workflow-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { AsyncBoundary } from "@/components/ui/async-boundary";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, FileText, Receipt as ReceiptIcon, Truck, ShoppingCart, ShieldAlert, Package, ClipboardList, AlertCircle, CreditCard, Download, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";

interface DocRow {
  id: string;
  number: string;
  type: string;
  date: string | null;
  party: string | null;
  amount: number | null;
  status: string | null;
}

const TYPE_META: Record<string, { label: string; icon: typeof FileText; color: string; route: string }> = {
  invoice:   { label: "Invoice",          icon: FileText,      color: "text-blue-500",    route: "/finance" },
  quotation: { label: "Quotation",        icon: FileText,      color: "text-violet-500",  route: "/quotations" },
  receipt:   { label: "Receipt",          icon: ReceiptIcon,   color: "text-emerald-500", route: "/finance" },
  delivery:  { label: "Delivery/Waybill", icon: Truck,         color: "text-orange-500",  route: "/logistics" },
  po:        { label: "Purchase Order",   icon: ShoppingCart,  color: "text-cyan-500",    route: "/procurement" },
  grn:       { label: "Goods Received",   icon: Package,       color: "text-amber-500",   route: "/procurement" },
  hse:       { label: "HSE Incident",     icon: ShieldAlert,   color: "text-red-500",     route: "/hse" },
  mr:        { label: "Material Req.",    icon: ClipboardList, color: "text-yellow-500",  route: "/procurement" },
  claim:     { label: "Worker Claim",     icon: AlertCircle,   color: "text-pink-500",    route: "/claims" },
  payment:   { label: "Worker Payment",   icon: CreditCard,    color: "text-indigo-500",  route: "/finance" },
};

const SOURCE_FETCH_LIMIT = 500;

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const DocumentRegistry = () => {
  const { memberships } = useAuth();
  const orgId = memberships[0]?.organization_id;
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const navigate = useNavigate();

  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["doc-registry", orgId],
    queryFn: async (): Promise<{ rows: DocRow[]; partial: string[] }> => {
      if (!orgId) return { rows: [], partial: [] };
      type Source = { key: string; run: () => Promise<DocRow[]> };
      const vendorMapPromise = supabase.from("vendors").select("id, name").eq("organization_id", orgId).then(r => {
        const m = new Map<string, string>();
        (r.data ?? []).forEach((v: any) => m.set(v.id, v.name));
        return m;
      });
      const sources: Source[] = [
        { key: "invoice",   run: async () => {
          const { data, error } = await supabase.from("invoices").select("id, document_number, invoice_date, total_amount, status, clients(name)").eq("organization_id", orgId).not("document_number", "is", null).order("invoice_date", { ascending: false }).limit(SOURCE_FETCH_LIMIT);
          if (error) throw error;
          return (data ?? []).map((r: any) => ({ id: r.id, number: r.document_number, type: "invoice", date: r.invoice_date, party: r.clients?.name ?? null, amount: r.total_amount, status: r.status }));
        }},
        { key: "quotation", run: async () => {
          const { data, error } = await supabase.from("quotations").select("id, quotation_number, created_at, total_amount, status, clients(name)").eq("organization_id", orgId).not("quotation_number", "is", null).order("created_at", { ascending: false }).limit(SOURCE_FETCH_LIMIT);
          if (error) throw error;
          return (data ?? []).map((r: any) => ({ id: r.id, number: r.quotation_number, type: "quotation", date: r.created_at, party: r.clients?.name ?? null, amount: r.total_amount, status: r.status }));
        }},
        { key: "receipt",   run: async () => {
          const { data, error } = await supabase.from("receipts").select("id, document_number, payment_date, amount_received, clients(name)").eq("organization_id", orgId).not("document_number", "is", null).order("payment_date", { ascending: false }).limit(SOURCE_FETCH_LIMIT);
          if (error) throw error;
          return (data ?? []).map((r: any) => ({ id: r.id, number: r.document_number, type: "receipt", date: r.payment_date, party: r.clients?.name ?? null, amount: r.amount_received, status: "issued" }));
        }},
        { key: "delivery",  run: async () => {
          const { data, error } = await supabase.from("deliveries").select("id, document_number, delivery_date, destination, status, cost").eq("organization_id", orgId).not("document_number", "is", null).order("delivery_date", { ascending: false }).limit(SOURCE_FETCH_LIMIT);
          if (error) throw error;
          return (data ?? []).map((r: any) => ({ id: r.id, number: r.document_number, type: "delivery", date: r.delivery_date, party: r.destination, amount: r.cost, status: r.status }));
        }},
        { key: "po",        run: async () => {
          const [{ data, error }, vendorMap] = await Promise.all([
            supabase.from("purchase_orders").select("id, document_number, created_at, total_amount, status, vendor_id").eq("organization_id", orgId).not("document_number", "is", null).order("created_at", { ascending: false }).limit(SOURCE_FETCH_LIMIT),
            vendorMapPromise,
          ]);
          if (error) throw error;
          return (data ?? []).map((r: any) => ({ id: r.id, number: r.document_number, type: "po", date: r.created_at, party: (r.vendor_id ? vendorMap.get(r.vendor_id) : null) ?? null, amount: r.total_amount, status: r.status }));
        }},
        { key: "grn",       run: async () => {
          const [{ data, error }, vendorMap] = await Promise.all([
            supabase.from("goods_received_notes").select("id, document_number, received_date, status, vendor_id").eq("organization_id", orgId).not("document_number", "is", null).order("received_date", { ascending: false }).limit(SOURCE_FETCH_LIMIT),
            vendorMapPromise,
          ]);
          if (error) throw error;
          return (data ?? []).map((r: any) => ({ id: r.id, number: r.document_number, type: "grn", date: r.received_date, party: (r.vendor_id ? vendorMap.get(r.vendor_id) : null) ?? null, amount: null, status: r.status }));
        }},
        { key: "hse",       run: async () => {
          const { data, error } = await supabase.from("hse_incidents").select("id, document_number, incident_date, type, severity, status").eq("organization_id", orgId).not("document_number", "is", null).order("incident_date", { ascending: false }).limit(SOURCE_FETCH_LIMIT);
          if (error) throw error;
          return (data ?? []).map((r: any) => ({ id: r.id, number: r.document_number, type: "hse", date: r.incident_date, party: r.type, amount: null, status: r.status }));
        }},
        { key: "mr",        run: async () => {
          const { data, error } = await supabase.from("material_requisitions").select("id, document_number, created_at, status").eq("organization_id", orgId).not("document_number", "is", null).order("created_at", { ascending: false }).limit(SOURCE_FETCH_LIMIT);
          if (error) throw error;
          return (data ?? []).map((r: any) => ({ id: r.id, number: r.document_number, type: "mr", date: r.created_at, party: null, amount: null, status: r.status }));
        }},
        { key: "claim",     run: async () => {
          const { data, error } = await supabase.from("worker_claims").select("id, document_number, created_at, amount, status, category").eq("organization_id", orgId).not("document_number", "is", null).order("created_at", { ascending: false }).limit(SOURCE_FETCH_LIMIT);
          if (error) throw error;
          return (data ?? []).map((r: any) => ({ id: r.id, number: r.document_number, type: "claim", date: r.created_at, party: r.category, amount: r.amount, status: r.status }));
        }},
        { key: "payment",   run: async () => {
          const { data, error } = await supabase.from("worker_payments").select("id, document_number, date, amount, type").eq("organization_id", orgId).not("document_number", "is", null).order("date", { ascending: false }).limit(SOURCE_FETCH_LIMIT);
          if (error) throw error;
          return (data ?? []).map((r: any) => ({ id: r.id, number: r.document_number, type: "payment", date: r.date, party: r.type, amount: r.amount, status: "logged" }));
        }},
      ];
      const results = await Promise.allSettled(sources.map(s => s.run()));
      const rows: DocRow[] = [];
      const partial: string[] = [];
      results.forEach((res, i) => {
        if (res.status === "fulfilled") rows.push(...res.value);
        else partial.push(sources[i].key);
      });
      rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
      return { rows, partial };
    },
    enabled: !!orgId,
  });

  const docs = data?.rows ?? [];
  const partial = data?.partial ?? [];

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate).getTime() : null;
    const to = toDate ? new Date(toDate).getTime() + 86_400_000 - 1 : null;
    return docs.filter(d => {
      if (needle && !((d.number ?? "").toLowerCase().includes(needle) || (d.party ?? "").toLowerCase().includes(needle) || d.type.includes(needle))) return false;
      if (from || to) {
        const t = d.date ? new Date(d.date).getTime() : NaN;
        if (Number.isNaN(t)) return false;
        if (from && t < from) return false;
        if (to && t > to) return false;
      }
      return true;
    });
  }, [docs, search, fromDate, toDate]);

  const grouped = useMemo(() => {
    const map: Record<string, DocRow[]> = {};
    for (const d of filtered) (map[d.type] ??= []).push(d);
    return map;
  }, [filtered]);

  const exportCsv = () => {
    if (!filtered.length) { toast({ title: "Nothing to export", description: "Adjust filters and try again." }); return; }
    const header = ["Reference", "Type", "Date", "Party", "Amount", "Status"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push([r.number, TYPE_META[r.type]?.label ?? r.type, r.date ?? "", r.party ?? "", r.amount ?? "", r.status ?? ""].map(csvEscape).join(","));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `document-registry-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const renderTable = (rows: DocRow[]) => (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={FileText}
              title="No documents in this view"
              description="Every numbered document issued in the ERP — invoices, receipts, quotations, waybills and Purchase Orders — appears here automatically when it's created in its own module."
              compact
            />
          </div>
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
                const route = TYPE_META[r.type]?.route;
                return (
                  <TableRow
                    key={`${r.type}-${r.id}`}
                    className={route ? "cursor-pointer hover:bg-muted/50" : undefined}
                    onClick={route ? () => navigate(route) : undefined}
                  >
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
      <PageHeader
        title="Document Registry"
        description="Every numbered document ever issued in the system — invoices, receipts, quotations, waybills, POs and more."
        executiveSummary={`${docs.length} numbered documents on file`}
        lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
        onRefresh={() => refetch()}
      />

      <WorkflowBanner
        storageKey="document-registry"
        summary="A read-only audit trail of every numbered document in the system. Documents are created in their source module (Finance, Quotations, Procurement, Logistics) and appear here for search and reference."
        steps={[
          { actor: "Source module", action: "creates the document (invoice, receipt, quotation, PO, waybill) and assigns it a permanent reference number." },
          { actor: "System", action: "indexes the document here so it can be found by reference, party or amount." },
          { actor: "Administrators / Auditors", action: "browse the registry to verify continuity and trace any document back to its origin." },
        ]}
      />

      {partial.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>Some document sources could not be loaded ({partial.join(", ")}). Other documents are shown below — try refreshing.</span>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by reference, client, vendor…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-col">
          <label className="text-[10px] uppercase text-muted-foreground mb-1">From</label>
          <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-[150px]" />
        </div>
        <div className="flex flex-col">
          <label className="text-[10px] uppercase text-muted-foreground mb-1">To</label>
          <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-[150px]" />
        </div>
        {(fromDate || toDate || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFromDate(""); setToDate(""); }}>Clear</Button>
        )}
        <Button variant="outline" size="sm" onClick={exportCsv} className="ml-auto">
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
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

        <TabsContent value="all">
          <AsyncBoundary loading={isLoading} error={error} onRetry={() => refetch()} loadingVariant="table" loadingRows={6} loadingColumns={6}>
            {renderTable(filtered)}
          </AsyncBoundary>
        </TabsContent>
        {Object.keys(TYPE_META).map(k => (
          <TabsContent key={k} value={k}>
            <AsyncBoundary loading={isLoading} error={error} onRetry={() => refetch()} loadingVariant="table" loadingRows={4} loadingColumns={6}>
              {renderTable(grouped[k] ?? [])}
            </AsyncBoundary>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default DocumentRegistry;