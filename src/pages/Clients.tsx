import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Phone, Mail, MapPin, User, MoreVertical, Loader2, Pencil, Trash2, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTaskStart } from "@/components/layout/PageTaskStart";
import { PageSecondaryDisclosure } from "@/components/layout/PageSecondaryDisclosure";
import { WorkflowBanner } from "@/components/ui/workflow-banner";
import { AsyncBoundary } from "@/components/ui/async-boundary";
import { Users } from "lucide-react";
import { useGsapStagger } from "@/hooks/useGsapAnimation";
import { AiInsightPanel } from "@/components/AiInsightPanel";
import { ClientDetailDialog } from "@/components/clients/ClientDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { humanizeError } from "@/lib/humanizeError";
import { NIGERIAN_STATES, lgasForState } from "@/lib/nigeriaLocations";

type ClientItem = Database["public"]["Tables"]["clients"]["Row"] & { tax_identification_number?: string | null; state?: string | null; local_government?: string | null };

const Clients = () => {
  const { user, memberships, activeRole, isMaintenance } = useAuth();
  const { toast } = useToast();
  const orgId = memberships[0]?.organization_id;
  const canEdit = activeRole === "administrator" || activeRole === "reception_sales" || activeRole === "hr" || isMaintenance;
  const canDelete = activeRole === "administrator" || isMaintenance;
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);
  const [viewingClient, setViewingClient] = useState<ClientItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientItem | null>(null);
  const [saving, setSaving] = useState(false);
  const listRef = useGsapStagger(".gsap-card", 0.06);

  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxIdentificationNumber, setTaxIdentificationNumber] = useState("");
  const [state, setState] = useState("");
  const [localGovernment, setLocalGovernment] = useState("");

  const { data: clients = [], isLoading, error: clientsError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["clients", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from("clients").select("*").eq("organization_id", orgId).order("name");
      if (error) throw error;
      return (data as ClientItem[]) ?? [];
    },
    enabled: !!orgId,
  });

  const openEdit = (client: ClientItem) => {
    setEditingClient(client);
    setName(client.name);
    setContactPerson(client.contact_person ?? "");
    setPhone(client.phone ?? "");
    setEmail(client.email ?? "");
    setAddress(client.address ?? "");
    setTaxIdentificationNumber(client.tax_identification_number ?? "");
    setState(client.state ?? "");
    setLocalGovernment(client.local_government ?? "");
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingClient(null);
    setName(""); setContactPerson(""); setPhone(""); setEmail(""); setAddress(""); setTaxIdentificationNumber(""); setState(""); setLocalGovernment("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !name.trim()) return;
    setSaving(true);
    try {
      const payload: Database["public"]["Tables"]["clients"]["Insert"] = {
        organization_id: orgId,
        name: name.trim(),
        contact_person: contactPerson || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        tax_identification_number: taxIdentificationNumber.trim() || null,
        state: state.trim() || null,
        local_government: localGovernment.trim() || null,
      } as Database["public"]["Tables"]["clients"]["Insert"] & Record<string, unknown>;
      if (editingClient) {
        const { error } = await supabase.from("clients").update(payload as Database["public"]["Tables"]["clients"]["Update"]).eq("id", editingClient.id);
        if (error) throw error;
        toast({ title: "Client updated" });
      } else {
        const { error } = await supabase.from("clients").insert(payload);
        if (error) throw error;
        toast({ title: "Client added" });
      }
      setDialogOpen(false);
      refetch();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error", description: humanizeError(error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("clients").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Client deleted" });
      setDeleteTarget(null);
      refetch();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error", description: humanizeError(error), variant: "destructive" });
    }
  };

  const filtered = clients.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.contact_person ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Clients"
        description="Manage your client database"
        executiveSummary={`${clients.length} client${clients.length === 1 ? "" : "s"} in directory`}
        lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
        onRefresh={() => refetch()}
      >
      </PageHeader>

      <WorkflowBanner
        storageKey="clients"
        summary="The client master powers every quotation, invoice, opportunity and project. Keep the company name and contact details accurate — they print on every document."
        steps={[
          { actor: "Marketing / HR / Admin", action: "register the client with company name, contact person and address." },
          { actor: "Sales", action: "raises Quotations and Opportunities against the client record." },
          { actor: "Finance", action: "issues Invoices and Receipts that automatically pull the client's details." },
        ]}
      />

      <PageTaskStart
        title="Start with your client directory"
        description="Find the company you need, add a new client, or move directly into the connected sales workflow."
        tasks={[
          ...(canEdit ? [{ title: "Add a client", description: "Create the record used by quotations and invoices.", href: undefined, onClick: openAdd, icon: Plus }] : []),
          { title: "Find a client", description: "Search by company or contact person.", href: undefined, onClick: () => document.getElementById("clients-search")?.focus(), icon: Search },
          { title: "Open quotations", description: "Continue from a client into a priced offer.", href: "/quotations", icon: FileText },
        ]}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2"><Label>Company Name *</Label><Input placeholder="e.g. Lagos Water Corp" value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Contact Person</Label><Input placeholder="Full name" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input placeholder="+234..." value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-2"><Label>Address</Label><Input placeholder="Office address" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
              <div className="space-y-2"><Label>TIN</Label><Input placeholder="Optional tax identification number" value={taxIdentificationNumber} onChange={(e) => setTaxIdentificationNumber(e.target.value)} /></div>
              <div className="space-y-2"><Label>State</Label><Select value={state || "none"} onValueChange={(value) => { setState(value === "none" ? "" : value); setLocalGovernment(""); }}><SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger><SelectContent><SelectItem value="none">Not specified</SelectItem>{NIGERIAN_STATES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Local Government</Label><Select value={localGovernment || "none"} onValueChange={(value) => setLocalGovernment(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder={state ? "Select LGA" : "Select state first"} /></SelectTrigger><SelectContent><SelectItem value="none">Not specified</SelectItem>{lgasForState(state).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}{editingClient ? "Update" : "Save"} Client</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. All data associated with this client will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageSecondaryDisclosure title="CRM intelligence" description="Use AI suggestions only after the client list is clear and you know which record needs attention.">
        <AiInsightPanel context="clients" title="CRM AI" suggestions={["Follow-up recommendations", "Client conversion prediction", "Revenue analysis by client", "Maintenance schedule review"]} data={clients} />
      </PageSecondaryDisclosure>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input id="clients-search" placeholder="Search clients..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <AsyncBoundary
        loading={isLoading}
        error={clientsError}
        onRetry={() => refetch()}
        isEmpty={filtered.length === 0}
        loadingVariant="cards"
        loadingRows={6}
        emptyState={clients.length === 0 ? {
          icon: Users,
          title: "No clients yet",
          description: "Clients must be created here before Quotations, Invoices and Opportunities can reference them. Add the first one to unlock the sales workflow.",
          ownedBy: "Marketing & Administrators",
          action: canEdit ? { label: "Add first client", onClick: openAdd } : undefined,
        } : {
          icon: Search,
          title: "No clients match your search",
          description: "Try a different keyword or clear the search to see every client.",
          compact: true,
        }}
      >
      <div ref={listRef} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((client: ClientItem) => (
          <Card key={client.id} className="gsap-card border-border/50 hover:border-primary/30 transition-all hover:shadow-md group cursor-pointer" onClick={() => setViewingClient(client)}>
            <CardContent className="pt-5 pb-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {client.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{client.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> {client.contact_person ?? "—"}</p>
                  </div>
                </div>
                {(canEdit || canDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Client actions">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit && <DropdownMenuItem onClick={() => openEdit(client)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>}
                      {canDelete && <DropdownMenuItem onClick={() => setDeleteTarget(client)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-2"><Phone className="h-3 w-3 shrink-0" /> {client.phone ?? "—"}</p>
                <p className="flex items-center gap-2"><Mail className="h-3 w-3 shrink-0" /> {client.email ?? "—"}</p>
                <p className="flex items-center gap-2"><MapPin className="h-3 w-3 shrink-0" /> {client.address ?? "—"}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      </AsyncBoundary>

      <ClientDetailDialog
        client={viewingClient}
        orgId={orgId ?? ""}
        open={!!viewingClient}
        onOpenChange={(open) => !open && setViewingClient(null)}
        onEdit={(client) => { setViewingClient(null); openEdit(client); }}
        onDelete={(client) => { setViewingClient(null); setDeleteTarget(client); }}
      />
    </div>
  );
};

export default Clients;
