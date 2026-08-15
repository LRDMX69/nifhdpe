import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, ExternalLink, FileText, ReceiptText, Truck, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { industrialDb } from "@/lib/industrialDb";
import { formatCurrency } from "@/lib/constants";

type PanelProps = { orgId?: string };
type ClientRow = { id: string; name: string; contact_person?: string | null };
type QuotationRow = { id: string; quotation_number: string; status: string; total_amount?: number | null; clients?: { name: string } | null };
type OrderRow = { id: string; order_number: string; status: string; total_amount?: number | null; clients?: { name: string } | null };
type InvoiceRow = { id: string; document_number: string; status: string; total_amount?: number | null; balance_due?: number | null; clients?: { name: string } | null };
type DeliveryRow = { id: string; delivery_date: string; status: string; destination: string; vehicle?: string | null; cost?: number | null; clients?: { name: string } | null };

export function HRCommercialOperationsPanel({ orgId }: PanelProps) {
  const navigate = useNavigate();
  const { data: clients = [] } = useQuery({
    queryKey: ["hr-commercial-clients", orgId],
    queryFn: async () => {
      if (!orgId) return [] as ClientRow[];
      const { data, error } = await supabase.from("clients").select("id, name, contact_person").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return (data ?? []) as ClientRow[];
    },
    enabled: !!orgId,
  });
  const { data: quotations = [] } = useQuery({
    queryKey: ["hr-commercial-quotations", orgId],
    queryFn: async () => {
      if (!orgId) return [] as QuotationRow[];
      const { data, error } = await supabase.from("quotations").select("id, quotation_number, status, total_amount, clients(name)").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return (data ?? []) as unknown as QuotationRow[];
    },
    enabled: !!orgId,
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["hr-commercial-orders", orgId],
    queryFn: async () => {
      if (!orgId) return [] as OrderRow[];
      const { data, error } = await industrialDb.from("sales_orders").select("id, order_number, status, total_amount, clients(name)").eq("organization_id", orgId).neq("status", "cancelled").order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
    enabled: !!orgId,
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["hr-commercial-invoices", orgId],
    queryFn: async () => {
      if (!orgId) return [] as InvoiceRow[];
      const { data, error } = await industrialDb.from("invoices").select("id, document_number, status, total_amount, balance_due, clients(name)").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return (data ?? []) as InvoiceRow[];
    },
    enabled: !!orgId,
  });
  const { data: deliveries = [] } = useQuery({
    queryKey: ["hr-commercial-deliveries", orgId],
    queryFn: async () => {
      if (!orgId) return [] as DeliveryRow[];
      const { data, error } = await supabase.from("deliveries").select("id, delivery_date, status, destination, vehicle, cost, clients(name)").eq("organization_id", orgId).order("delivery_date", { ascending: false }).limit(8);
      if (error) throw error;
      return (data ?? []) as unknown as DeliveryRow[];
    },
    enabled: !!orgId,
  });

  const acceptedValue = quotations.filter((row) => row.status === "accepted").reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
  const outstanding = invoices.reduce((sum, row) => sum + Number(row.balance_due ?? 0), 0);
  const activeDeliveries = deliveries.filter((row) => row.status === "pending" || row.status === "in_transit").length;
  const summary = [
    { label: "Clients", value: clients.length, icon: Users },
    { label: "Accepted quotations", value: formatCurrency(acceptedValue), icon: FileText },
    { label: "Outstanding invoices", value: formatCurrency(outstanding), icon: ReceiptText },
    { label: "Active deliveries", value: activeDeliveries, icon: Truck },
  ];

  return <Card className="border-primary/20 bg-primary/[0.03]">
    <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-base"><BriefcaseBusiness className="h-5 w-5 text-primary" /> Commercial & Operations Oversight</CardTitle><p className="mt-1 text-xs text-muted-foreground">Live read-only visibility for HR. Every record opens in its existing owning module; no duplicate data is stored here.</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => navigate("/clients")}><Users className="mr-1 h-3.5 w-3.5" />Clients</Button><Button size="sm" variant="outline" onClick={() => navigate("/quotations")}><FileText className="mr-1 h-3.5 w-3.5" />Quotations</Button><Button size="sm" variant="outline" onClick={() => navigate("/logistics")}><Truck className="mr-1 h-3.5 w-3.5" />Logistics</Button></div></CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{summary.map((item) => <div key={item.label} className="rounded-lg border bg-background/60 p-3"><div className="flex items-center justify-between gap-2"><p className="text-[10px] text-muted-foreground">{item.label}</p><item.icon className="h-3.5 w-3.5 text-primary" /></div><p className="mt-1 break-words text-sm font-bold">{item.value}</p></div>)}</div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Commercial pipeline</CardTitle></CardHeader><CardContent className="space-y-2">{quotations.length === 0 && orders.length === 0 ? <EmptyState compact icon={FileText} title="No commercial records" description="Quotations and sales orders created in their native modules will appear here." /> : <>{quotations.slice(0, 4).map((row) => <div key={row.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/30 p-2"><div className="min-w-0"><p className="truncate text-xs font-medium">{row.quotation_number} · {row.clients?.name ?? "Unassigned client"}</p><p className="text-[10px] text-muted-foreground">Quotation</p></div><div className="flex shrink-0 items-center gap-1"><Badge variant="outline" className="text-[10px] capitalize">{row.status}</Badge><span className="text-xs font-semibold text-primary">{formatCurrency(Number(row.total_amount ?? 0))}</span></div></div>)}{orders.slice(0, 4).map((row) => <div key={row.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/30 p-2"><div className="min-w-0"><p className="truncate text-xs font-medium">{row.order_number} · {row.clients?.name ?? "Unassigned client"}</p><p className="text-[10px] text-muted-foreground">Sales order</p></div><Badge variant="outline" className="shrink-0 text-[10px] capitalize">{row.status}</Badge></div>)}</>}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Finance & logistics pulse</CardTitle></CardHeader><CardContent className="space-y-2">{invoices.length === 0 && deliveries.length === 0 ? <EmptyState compact icon={Truck} title="No linked records" description="Invoices and deliveries will appear here as the commercial and dispatch workflows progress." /> : <>{invoices.slice(0, 4).map((row) => <div key={row.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/30 p-2"><div className="min-w-0"><p className="truncate text-xs font-medium">{row.document_number} · {row.clients?.name ?? "Unassigned client"}</p><p className="text-[10px] text-muted-foreground">Invoice · balance {formatCurrency(Number(row.balance_due ?? 0))}</p></div><Badge variant="outline" className="shrink-0 text-[10px] capitalize">{row.status}</Badge></div>)}{deliveries.slice(0, 4).map((row) => <div key={row.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/30 p-2"><div className="min-w-0"><p className="truncate text-xs font-medium">{row.clients?.name ?? "Unassigned client"} · {row.destination}</p><p className="text-[10px] text-muted-foreground">{row.delivery_date}{row.vehicle ? ` · ${row.vehicle}` : ""}</p></div><Badge variant="outline" className="shrink-0 text-[10px] capitalize">{row.status.replace("_", " ")}</Badge></div>)}</>}</CardContent></Card>
      </div>
      <Button variant="ghost" size="sm" className="px-0 text-xs text-muted-foreground" onClick={() => navigate("/finance")}><ExternalLink className="mr-1 h-3.5 w-3.5" />Open Finance for full invoice, payment, and expense detail</Button>
    </CardContent>
  </Card>;
}
