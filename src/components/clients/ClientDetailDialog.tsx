import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone, Mail, MapPin, Copy, Check, Download, Briefcase, Receipt, FileText,
  FolderKanban, ArrowUpRight, Pencil, Trash2, User,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/constants";
import { getStatusMeta } from "@/lib/statusCopy";
import { exportCsv } from "@/lib/exportCsv";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];

interface QuotationRow {
  id: string;
  quotation_number: string | null;
  status: string;
  total_amount: number | null;
  valid_until: string | null;
  created_at: string;
}
interface InvoiceRow {
  id: string;
  document_number: string | null;
  status: string | null;
  total_amount: number | null;
  balance_due: number | null;
  invoice_date: string | null;
}
interface ProjectRow {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const ClientDetailDialog = ({
  client,
  orgId,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  client: Client | null;
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (client: Client) => void;
  onDelete?: (client: Client) => void;
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const clientId = client?.id ?? null;

  const { data: quotations = [], isLoading: loadingQuotations } = useQuery({
    queryKey: ["client-quotations", orgId, clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("quotations")
        .select("id, quotation_number, status, total_amount, valid_until, created_at")
        .eq("organization_id", orgId)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as QuotationRow[];
    },
    enabled: !!clientId && open,
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["client-invoices", orgId, clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("id, document_number, status, total_amount, balance_due, invoice_date")
        .eq("organization_id", orgId)
        .eq("client_id", clientId)
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InvoiceRow[];
    },
    enabled: !!clientId && open,
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["client-projects", orgId, clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, budget, start_date, end_date")
        .eq("organization_id", orgId)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProjectRow[];
    },
    enabled: !!clientId && open,
  });

  const stats = useMemo(() => {
    const openQuotes = quotations.filter((q) => ["draft", "sent"].includes(q.status));
    const acceptedQuotes = quotations.filter((q) => q.status === "accepted");
    const openQuoteValue = openQuotes.reduce((s, q) => s + Number(q.total_amount ?? 0), 0);
    const acceptedValue = acceptedQuotes.reduce((s, q) => s + Number(q.total_amount ?? 0), 0);
    const invoicedTotal = invoices.reduce((s, i) => s + Number(i.total_amount ?? 0), 0);
    const outstanding = invoices
      .filter((i) => !["paid", "cancelled"].includes(i.status ?? ""))
      .reduce((s, i) => s + Number(i.balance_due ?? i.total_amount ?? 0), 0);
    return { openQuoteCount: openQuotes.length, openQuoteValue, acceptedValue, invoicedTotal, outstanding, projectCount: projects.length };
  }, [quotations, invoices, projects]);

  const handleCopy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    toast({ title: ok ? `${label} copied` : "Could not copy — clipboard unavailable", variant: ok ? "default" : "destructive" });
  };

  const handleExport = () => {
    exportCsv(`client-${client?.name ?? "records"}-records`, [
      { header: "Type", value: (r: Record<string, unknown>) => String(r.kind) },
      { header: "Reference", value: (r) => String(r.reference ?? "") },
      { header: "Status", value: (r) => String(r.status ?? "") },
      { header: "Amount (₦)", value: (r) => String(r.amount ?? "") },
      { header: "Date", value: (r) => String(r.date ?? "") },
    ], [
      ...quotations.map((q) => ({ kind: "Quotation", reference: q.quotation_number, status: q.status, amount: Number(q.total_amount ?? 0), date: q.created_at })),
      ...invoices.map((i) => ({ kind: "Invoice", reference: i.document_number, status: i.status, amount: Number(i.total_amount ?? 0), date: i.invoice_date })),
      ...projects.map((p) => ({ kind: "Project", reference: p.name, status: p.status, amount: Number(p.budget ?? 0), date: p.start_date })),
    ]);
  };

  const loading = loadingQuotations || loadingInvoices || loadingProjects;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {client && (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-3 pr-8">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                    {client.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg truncate">{client.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-1">
                      <User className="h-3 w-3" /> {client.contact_person ?? "No contact person set"}
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {client.phone && (
                    <Button variant="outline" size="icon" className="h-8 w-8" title="Call" asChild>
                      <a href={`tel:${client.phone}`}><Phone className="h-3.5 w-3.5" /></a>
                    </Button>
                  )}
                  {client.email && (
                    <Button variant="outline" size="icon" className="h-8 w-8" title="Email" asChild>
                      <a href={`mailto:${client.email}`}><Mail className="h-3.5 w-3.5" /></a>
                    </Button>
                  )}
                  <Button variant="outline" size="icon" className="h-8 w-8" title="Copy email" onClick={() => client.email && handleCopy(client.email, "Email")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExport}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Export
                  </Button>
                  {onEdit && (
                    <Button variant="outline" size="icon" className="h-8 w-8" title="Edit client" onClick={() => onEdit(client)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="outline" size="icon" className="h-8 w-8 text-destructive" title="Delete client" onClick={() => onDelete(client)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-2 text-sm text-muted-foreground px-1">
              {client.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{client.phone}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" title="Copy phone" onClick={() => client.phone && handleCopy(client.phone, "Phone")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </p>
              )}
              {client.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0" /> {client.email}</p>}
              {client.address && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" /> {client.address}</p>}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-border/50"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground font-medium">Open Quotations</p><p className="text-lg font-bold truncate">{stats.openQuoteCount} · {formatCurrency(stats.openQuoteValue)}</p></CardContent></Card>
                <Card className="border-border/50"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground font-medium">Accepted Value</p><p className="text-lg font-bold text-primary truncate">{formatCurrency(stats.acceptedValue)}</p></CardContent></Card>
                <Card className="border-border/50"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground font-medium">Invoiced</p><p className="text-lg font-bold truncate">{formatCurrency(stats.invoicedTotal)}</p></CardContent></Card>
                <Card className="border-border/50"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground font-medium">Outstanding</p><p className="text-lg font-bold text-warning truncate">{formatCurrency(stats.outstanding)}</p></CardContent></Card>
              </div>
            )}

            <div className="space-y-4">
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Quotations <Badge variant="outline">{quotations.length}</Badge></h3>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { onOpenChange(false); navigate("/quotations"); }}>
                    Open quotations <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                {quotations.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No quotations recorded against this client yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {quotations.map((q) => {
                      const meta = getStatusMeta(q.status);
                      return (
                        <div key={q.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm">
                          <span className="font-medium truncate">{q.quotation_number ?? "—"}</span>
                          <span className="flex items-center gap-2 shrink-0">
                            <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
                            <span className="font-semibold">{formatCurrency(Number(q.total_amount ?? 0))}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Invoices <Badge variant="outline">{invoices.length}</Badge></h3>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { onOpenChange(false); navigate("/finance?tab=invoices"); }}>
                    Open invoices <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                {invoices.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No invoices recorded against this client yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {invoices.map((i) => {
                      const meta = getStatusMeta(i.status);
                      return (
                        <div key={i.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm">
                          <span className="font-medium truncate">{i.document_number ?? "—"}</span>
                          <span className="flex items-center gap-2 shrink-0">
                            <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
                            <span className="font-semibold">{formatCurrency(Number(i.total_amount ?? 0))}</span>
                            {Number(i.balance_due ?? 0) > 0 && <span className="text-[10px] text-muted-foreground">due {formatCurrency(Number(i.balance_due))}</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><FolderKanban className="h-4 w-4 text-primary" /> Projects <Badge variant="outline">{projects.length}</Badge></h3>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { onOpenChange(false); navigate("/projects"); }}>
                    Open projects <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                {projects.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No projects linked to this client yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {projects.map((p) => {
                      const meta = getStatusMeta(p.status);
                      return (
                        <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm">
                          <span className="font-medium truncate">{p.name}</span>
                          <span className="flex items-center gap-2 shrink-0">
                            <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
                            <span className="font-semibold">{formatCurrency(Number(p.budget ?? 0))}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
