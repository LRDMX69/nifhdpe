import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, FileClock, Link2, Loader2, PackageCheck, RefreshCw, Wrench } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { industrialDb, type IndustrialRow } from "@/lib/industrialDb";
import { formatCurrency } from "@/lib/constants";

const statusTone: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary", confirmed: "default", accepted: "default", reserved: "outline", pass: "default",
  open: "outline", in_progress: "outline", resolved: "default", awaiting_configuration: "secondary",
};

const Operations = () => {
  const { memberships, activeRole, isMaintenance } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = memberships[0]?.organization_id;
  const canCreateOrder = isMaintenance || ["administrator", "reception_sales", "accountant"].includes(activeRole ?? "");
  const [creatingOrder, setCreatingOrder] = useState<string | null>(null);

  const quotes = useQuery({
    queryKey: ["operations-accepted-quotes", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await industrialDb.from("quotations")
        .select("id, quotation_number, client_id, total_amount, status, clients(name)")
        .eq("organization_id", orgId).eq("status", "accepted").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as IndustrialRow[];
    },
  });

  const orders = useQuery({
    queryKey: ["operations-sales-orders", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await industrialDb.from("sales_orders")
        .select("*, clients(name), quotations(quotation_number)")
        .eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as IndustrialRow[];
    },
  });

  const reservations = useQuery({
    queryKey: ["operations-reservations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await industrialDb.from("inventory_reservations")
        .select("*, product_specifications(product_code, product_name), sales_orders(order_number)")
        .eq("organization_id", orgId).neq("status", "cancelled").order("reserved_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as IndustrialRow[];
    },
  });

  const fusion = useQuery({
    queryKey: ["operations-fusion-joints", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await industrialDb.from("fusion_joints")
        .select("*, projects(name), equipment(name)").eq("organization_id", orgId)
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as IndustrialRow[];
    },
  });

  const service = useQuery({
    queryKey: ["operations-service-tickets", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await industrialDb.from("service_tickets")
        .select("*, clients(name)").eq("organization_id", orgId)
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as IndustrialRow[];
    },
  });

  const revisions = useQuery({
    queryKey: ["operations-revisions", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await industrialDb.from("document_revisions")
        .select("*").eq("organization_id", orgId).order("changed_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as IndustrialRow[];
    },
  });

  const stats = useMemo(() => ({
    accepted: quotes.data?.length ?? 0,
    orders: orders.data?.length ?? 0,
    reserved: reservations.data?.filter((r) => r.status === "reserved").length ?? 0,
    openService: service.data?.filter((t) => !["resolved", "closed", "rejected"].includes(t.status)).length ?? 0,
  }), [quotes.data, orders.data, reservations.data, service.data]);

  const createOrder = async (quote: IndustrialRow) => {
    if (!orgId) return;
    setCreatingOrder(quote.id);
    try {
      const { error } = await industrialDb.rpc("create_sales_order_from_quotation", {
        _org_id: orgId, _quotation_id: quote.id,
        _notes: "Created from accepted quotation in Operations Control",
      });
      if (error) throw error;
      toast({ title: "Sales order created", description: `${quote.quotation_number} is now linked to a sales order.` });
      await queryClient.invalidateQueries({ queryKey: ["operations-sales-orders", orgId] });
      await queryClient.invalidateQueries({ queryKey: ["operations-accepted-quotes", orgId] });
    } catch (error) {
      toast({ title: "Could not create sales order", description: error instanceof Error ? error.message : "The server rejected the operation.", variant: "destructive" });
    } finally {
      setCreatingOrder(null);
    }
  };

  const isLoading = [quotes, orders, reservations, fusion, service, revisions].some((q) => q.isLoading);

  return (
    <div className="space-y-6">
      <PageHeader title="Operations Control" description="Connected commercial, stock, project-quality, service, and document workflows." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 pt-6"><Link2 className="h-5 w-5 text-primary" /><div><p className="text-2xl font-semibold">{stats.accepted}</p><p className="text-xs text-muted-foreground">Accepted quotations</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6"><CheckCircle2 className="h-5 w-5 text-primary" /><div><p className="text-2xl font-semibold">{stats.orders}</p><p className="text-xs text-muted-foreground">Sales orders</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6"><PackageCheck className="h-5 w-5 text-primary" /><div><p className="text-2xl font-semibold">{stats.reserved}</p><p className="text-xs text-muted-foreground">Active reservations</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6"><Wrench className="h-5 w-5 text-primary" /><div><p className="text-2xl font-semibold">{stats.openService}</p><p className="text-xs text-muted-foreground">Open service tickets</p></div></CardContent></Card>
      </div>
      {isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading linked operational records…</div>}
      <Tabs defaultValue="commercial" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="commercial">Commercial</TabsTrigger><TabsTrigger value="stock">Stock</TabsTrigger><TabsTrigger value="quality">Fusion QA</TabsTrigger><TabsTrigger value="service">Service</TabsTrigger><TabsTrigger value="history">Revisions</TabsTrigger>
        </TabsList>
        <TabsContent value="commercial" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">Accepted quotations awaiting an order</CardTitle></CardHeader><CardContent className="space-y-3">
            {(quotes.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No accepted quotations are waiting for conversion.</p> : (quotes.data ?? []).map((q) => <div key={q.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{q.quotation_number ?? "Quotation"}</p><p className="text-sm text-muted-foreground">{q.clients?.name ?? "Client not linked"} · {formatCurrency(Number(q.total_amount ?? 0))}</p><p className="text-xs text-muted-foreground">Opportunity linkage is not present in the current quotation schema.</p></div>{canCreateOrder && <Button size="sm" onClick={() => createOrder(q)} disabled={creatingOrder === q.id || !orgId}>{creatingOrder === q.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}Create sales order</Button>}</div>)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Sales orders</CardTitle></CardHeader><CardContent className="space-y-2">{(orders.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No sales orders recorded yet.</p> : (orders.data ?? []).map((o) => <div key={o.id} className="flex items-center justify-between rounded border p-3"><div><p className="font-medium">{o.order_number}</p><p className="text-xs text-muted-foreground">{o.clients?.name ?? "Client"} · from {o.quotations?.quotation_number ?? "quotation"}</p></div><Badge variant={statusTone[o.status] ?? "secondary"}>{o.status}</Badge></div>)}</CardContent></Card>
        </TabsContent>
        <TabsContent value="stock"><Card><CardHeader><CardTitle className="text-base">Reservations and stock commitment</CardTitle></CardHeader><CardContent className="space-y-2">{(reservations.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No reservations recorded. Stock remains uncommitted.</p> : (reservations.data ?? []).map((r) => <div key={r.id} className="flex items-center justify-between rounded border p-3"><div><p className="font-medium">{r.product_specifications?.product_code ?? "Unmapped product"}</p><p className="text-xs text-muted-foreground">{r.product_specifications?.product_name ?? "Specification pending"} · {r.quantity} · order {r.sales_orders?.order_number ?? "not linked"}</p></div><Badge variant={statusTone[r.status] ?? "secondary"}>{r.status}</Badge></div>)}</CardContent></Card></TabsContent>
        <TabsContent value="quality"><Card><CardHeader><CardTitle className="text-base">Fusion joint traceability</CardTitle></CardHeader><CardContent className="space-y-2">{(fusion.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No fusion joints recorded. Technical acceptance criteria remain awaiting configuration.</p> : (fusion.data ?? []).map((j) => <div key={j.id} className="flex items-center justify-between rounded border p-3"><div><p className="font-medium">{j.joint_id} · {j.joint_type}</p><p className="text-xs text-muted-foreground">Lot: {j.material_lot ?? "not captured"} · {j.projects?.name ?? "project not linked"}</p></div><Badge variant={statusTone[j.result] ?? "secondary"}>{j.result}</Badge></div>)}</CardContent></Card></TabsContent>
        <TabsContent value="service"><Card><CardHeader><CardTitle className="text-base">After-sales service and warranty</CardTitle></CardHeader><CardContent className="space-y-2">{(service.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No service tickets recorded.</p> : (service.data ?? []).map((t) => <div key={t.id} className="flex items-center justify-between rounded border p-3"><div><p className="font-medium">{t.ticket_number} · {t.subject}</p><p className="text-xs text-muted-foreground">{t.clients?.name ?? "Client not linked"} · priority {t.priority}</p></div><Badge variant={statusTone[t.status] ?? "secondary"}>{t.status}</Badge></div>)}</CardContent></Card></TabsContent>
        <TabsContent value="history"><Card><CardHeader><CardTitle className="text-base">Document revision history</CardTitle></CardHeader><CardContent className="space-y-2">{(revisions.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No revisions recorded yet. Finalized documents will appear here when revised through the revision RPC.</p> : (revisions.data ?? []).map((r) => <div key={r.id} className="flex items-center justify-between rounded border p-3"><div><p className="font-medium">{r.entity_type} · revision {r.revision_number}</p><p className="text-xs text-muted-foreground">{r.change_reason}</p></div><Badge variant={r.is_current ? "default" : "secondary"}>{r.is_current ? "current" : "historical"}</Badge></div>)}</CardContent></Card></TabsContent>
      </Tabs>
      <div className="flex items-center justify-between text-xs text-muted-foreground"><span>All values come from organization-scoped database records. No demo metrics are generated.</span><Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["operations"] })}><RefreshCw className="mr-2 h-3 w-3" />Refresh</Button></div>
    </div>
  );
};

export default Operations;
