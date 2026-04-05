import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Phone, Mail, MapPin, User, MoreVertical, Loader2, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useGsapStagger } from "@/hooks/useGsapAnimation";
import { AiInsightPanel } from "@/components/AiInsightPanel";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Clients = () => {
  const { user, memberships, activeRole, isMaintenance } = useAuth();
  const { toast } = useToast();
  const orgId = memberships[0]?.organization_id;
  const canEdit = activeRole === "administrator" || activeRole === "reception_sales" || isMaintenance;
  const canDelete = activeRole === "administrator" || isMaintenance;
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const listRef = useGsapStagger(".gsap-card", 0.06);

  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ["clients", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from("clients").select("*").eq("organization_id", orgId).order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const openEdit = (client: any) => {
    setEditingClient(client);
    setName(client.name);
    setContactPerson(client.contact_person ?? "");
    setPhone(client.phone ?? "");
    setEmail(client.email ?? "");
    setAddress(client.address ?? "");
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingClient(null);
    setName(""); setContactPerson(""); setPhone(""); setEmail(""); setAddress("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        contact_person: contactPerson || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
      };
      if (editingClient) {
        const { error } = await supabase.from("clients").update(payload).eq("id", editingClient.id);
        if (error) throw error;
        toast({ title: "Client updated" });
      } else {
        const { error } = await supabase.from("clients").insert({ ...payload, organization_id: orgId });
        if (error) throw error;
        toast({ title: "Client added" });
      }
      setDialogOpen(false);
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const filtered = clients.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.contact_person ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader title="Clients" description="Manage your client database">
        {canEdit && (
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Add Client</span><span className="sm:hidden">Add</span></Button>
        )}
      </PageHeader>

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

      <AiInsightPanel context="clients" title="CRM AI" suggestions={["Follow-up recommendations", "Client conversion prediction", "Revenue analysis by client", "Maintenance schedule review"]} data={clients} />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search clients..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div ref={listRef} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <Card className="sm:col-span-2 xl:col-span-3 border-border/50"><CardContent className="py-8 text-center text-muted-foreground">
            {clients.length === 0 ? "No clients yet. Add your first client above." : "No clients match your search."}
          </CardContent></Card>
        )}
        {filtered.map((client) => (
          <Card key={client.id} className="gsap-card border-border/50 hover:border-primary/30 transition-all hover:shadow-md group">
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
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit && <DropdownMenuItem onClick={() => openEdit(client)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>}
                      {canDelete && <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(client)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>}
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
    </div>
  );
};

export default Clients;
