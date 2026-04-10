import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wrench, Clock, MapPin, AlertCircle, CheckCircle2, XCircle, Loader2, Send, MoreVertical, Pencil, Trash2, FileDown, Phone, MessageSquare, Users } from "lucide-react";
import { useGsapAnimation } from "@/hooks/useGsapAnimation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
// generatePdf loaded dynamically

const statusColors: Record<string, string> = {
  available: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  in_use: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  maintenance: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  retired: "bg-red-500/10 text-red-500 border-red-500/20",
};
const allEqStatuses = ["available", "in_use", "maintenance", "retired"];

const Equipment = () => {
  const { user, activeRole, memberships, isMaintenance } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editingEquip, setEditingEquip] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [requestReason, setRequestReason] = useState("");
  const [requestProject, setRequestProject] = useState("");
  const [escalateRequest, setEscalateRequest] = useState<any>(null);
  const containerRef = useGsapAnimation("slideUp");
  const orgId = memberships[0]?.organization_id;
  const isAdmin = activeRole === "administrator" || isMaintenance;
  const canManage = isAdmin || activeRole === "warehouse";
  const canRequest = activeRole === "technician" || activeRole === "engineer";

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [newHours, setNewHours] = useState("");
  const [newMaintDate, setNewMaintDate] = useState("");
  const [newStatus, setNewStatus] = useState("available");

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ["equipment", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("equipment").select("*, projects(name)").eq("organization_id", orgId).order("name");
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list-eq"],
    queryFn: async () => { const { data } = await supabase.from("projects").select("id, name").order("name"); return data ?? []; },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["equipment-requests", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("equipment_requests").select("*, equipment(name)").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(30);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const openEdit = (e: any) => {
    setEditingEquip(e);
    setNewName(e.name); setNewType(e.type ?? ""); setNewSerial(e.serial_number ?? "");
    setNewHours(e.usage_hours?.toString() ?? ""); setNewMaintDate(e.next_maintenance_date ?? "");
    setNewStatus(e.status);
    setAddOpen(true);
  };

  const openAdd = () => {
    setEditingEquip(null);
    setNewName(""); setNewType(""); setNewSerial(""); setNewHours(""); setNewMaintDate("");
    setNewStatus("available");
    setAddOpen(true);
  };

  const saveEquipment = useMutation({
    mutationFn: async () => {
      if (!orgId || !user) throw new Error("Not authenticated");
      const payload: any = {
        name: newName, type: newType || null, serial_number: newSerial || null,
        usage_hours: newHours ? parseFloat(newHours) : 0, next_maintenance_date: newMaintDate || null,
        status: newStatus as any,
      };
      if (editingEquip) {
        const { error } = await supabase.from("equipment").update(payload).eq("id", editingEquip.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("equipment").insert({ ...payload, organization_id: orgId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingEquip ? "Equipment updated" : "Equipment added" });
      setAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("equipment").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Equipment deleted" });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from("equipment").update({ status: status as any }).eq("id", id);
      if (error) throw error;
      toast({ title: `Status → ${status.replace("_", " ")}` });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!user || !orgId || !selectedEquipment) throw new Error("Missing data");
      const { error } = await supabase.from("equipment_requests").insert({
        organization_id: orgId, equipment_id: selectedEquipment.id,
        requested_by: user.id, reason: requestReason || null, project_id: requestProject || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Request submitted" });
      setRequestOpen(false); setRequestReason(""); setRequestProject(""); setSelectedEquipment(null);
      queryClient.invalidateQueries({ queryKey: ["equipment-requests"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("equipment_requests").update({ status, reviewed_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Request updated" }); queryClient.invalidateQueries({ queryKey: ["equipment-requests"] }); },
  });

  const handlePrintSheet = async () => {
    const { generatePdf } = await import("@/lib/generatePdf");
    generatePdf({
      title: "Equipment Allocation Sheet",
      tableData: {
        columns: [
          { header: "Name", dataKey: "name" },
          { header: "Type", dataKey: "type" },
          { header: "S/N", dataKey: "serial" },
          { header: "Status", dataKey: "status" },
          { header: "Hours", dataKey: "hours" },
          { header: "Site", dataKey: "site" },
        ],
        rows: equipment.map((e: any) => ({
          name: e.name, type: e.type ?? "N/A", serial: e.serial_number ?? "N/A",
          status: e.status, hours: e.usage_hours ?? 0, site: e.projects?.name ?? "N/A",
        })),
      },
      showSignature: true,
    });
  };

  const stats = [
    { label: "Total", value: equipment.length, icon: Wrench },
    { label: "In Use", value: equipment.filter((e: any) => e.status === "in_use").length, icon: MapPin },
    { label: "Available", value: equipment.filter((e: any) => e.status === "available").length, icon: Clock },
    { label: "Maintenance", value: equipment.filter((e: any) => e.status === "maintenance").length, icon: AlertCircle },
  ];

  return (
    <div ref={containerRef} className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Equipment" description="Track machinery, tools, and vehicles">
        <div className="flex gap-2 flex-wrap">
          {canManage && <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add</Button>}
          <Button variant="outline" size="sm" onClick={handlePrintSheet}><FileDown className="h-4 w-4 mr-1" /><span className="hidden sm:inline">PDF</span></Button>
        </div>
      </PageHeader>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingEquip ? "Edit Equipment" : "Add Equipment"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., Butt Fusion Machine BF-315" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label>
                <Select value={newType} onValueChange={setNewType}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{["Fusion Machine", "Testing", "Tools", "Vehicle", "Generator", "Other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Serial #</Label><Input value={newSerial} onChange={e => setNewSerial(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Usage Hours</Label><Input type="number" value={newHours} onChange={e => setNewHours(e.target.value)} /></div>
              <div className="space-y-2"><Label>Next Maintenance</Label><Input type="date" value={newMaintDate} onChange={e => setNewMaintDate(e.target.value)} /></div>
            </div>
            {editingEquip && (
              <div className="space-y-2"><Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{allEqStatuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full" onClick={() => saveEquipment.mutate()} disabled={!newName || saveEquipment.isPending}>
              {saveEquipment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingEquip ? "Update" : "Add"} Equipment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Equipment</DialogTitle></DialogHeader>
          {selectedEquipment && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium text-sm">{selectedEquipment.name}</p>
                <p className="text-xs text-muted-foreground">Currently: {selectedEquipment.status?.replace("_", " ")}</p>
              </div>
              <div className="space-y-2"><Label>Project (optional)</Label>
                <Select value={requestProject} onValueChange={setRequestProject}><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Reason</Label><Textarea value={requestReason} onChange={e => setRequestReason(e.target.value)} placeholder="Why?" rows={3} /></div>
              <Button className="w-full" onClick={() => submitRequest.mutate()} disabled={submitRequest.isPending}>
                {submitRequest.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Submit
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <Card key={s.label}><CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground truncate">{s.label}</p><p className="text-lg sm:text-2xl font-bold">{s.value}</p></div>
              <s.icon className="h-5 w-5 sm:h-8 sm:w-8 text-primary opacity-60 shrink-0" />
            </div>
          </CardContent></Card>
        ))}
      </div>

      {isAdmin && requests.filter((r: any) => r.status === "pending").length > 0 && (
        <Card className="border-warning/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-warning flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Pending Requests ({requests.filter((r: any) => r.status === "pending").length})
          </CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {requests.filter((r: any) => r.status === "pending").map((r: any) => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/30">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.equipment?.name ?? "Equipment"}</p>
                  {r.reason && <p className="text-xs text-muted-foreground">{r.reason}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-xs text-primary" onClick={() => updateRequest.mutate({ id: r.id, status: "approved" })}><CheckCircle2 className="h-3 w-3 mr-1" />Approve</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => updateRequest.mutate({ id: r.id, status: "denied" })}><XCircle className="h-3 w-3 mr-1" />Deny</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading equipment...</p>}
      <div className="space-y-2">
        {equipment.map((e: any) => (
          <Card key={e.id} className="hover:border-primary/20 transition-colors">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{e.name}</p>
                    <Badge className={statusColors[e.status] ?? ""} variant="outline">{e.status?.replace("_", " ")}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] sm:text-xs text-muted-foreground">
                    {e.type && <span>{e.type}</span>}
                    {e.serial_number && <span>S/N: {e.serial_number}</span>}
                    {e.usage_hours != null && <span>{Number(e.usage_hours).toLocaleString()}h</span>}
                    {e.projects?.name && <span className="text-primary">@ {e.projects.name}</span>}
                    {e.next_maintenance_date && <span>Maint: {e.next_maintenance_date}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {canRequest && (e.status === "in_use" || e.status === "available") && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => { setSelectedEquipment(e); setRequestOpen(true); }}>
                      <Send className="h-3 w-3 mr-1" />{e.status === "available" ? "Use" : "Request"}
                    </Button>
                  )}
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {allEqStatuses.filter(s => s !== e.status).map(s => (
                          <DropdownMenuItem key={s} onClick={() => handleStatusChange(e.id, s)} className="capitalize">{s.replace("_", " ")}</DropdownMenuItem>
                        ))}
                        {isAdmin && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(e)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem></>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Equipment;
