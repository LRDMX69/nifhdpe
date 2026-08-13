import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Calendar, Loader2, MoreVertical, Pencil, Trash2, Users, MapPin, BarChart3, Download, ClipboardCheck } from "lucide-react";
import { ProjectPnL } from "@/components/projects/ProjectPnL";
import { PageHeader } from "@/components/layout/PageHeader";
import { useGsapStagger } from "@/hooks/useGsapAnimation";
import { formatCurrency } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { WorkflowBanner } from "@/components/ui/workflow-banner";
import { AsyncBoundary } from "@/components/ui/async-boundary";
import type { Database } from "@/integrations/supabase/types";
import { humanizeError } from "@/lib/humanizeError";
import { exportCsv, csvDate } from "@/lib/exportCsv";
import { industrialDb, type IndustrialRow } from "@/lib/industrialDb";

type ProjectItem = Database["public"]["Tables"]["projects"]["Row"] & { clients?: { name: string } | null };
type ClientItem = { id: string; name: string };
type MemberItem = { user_id: string; full_name: string | null };
type ProjectInventoryRow = { id: string; item_name: string; quantity_meters: number | null; lot_batch?: string | null; product_specification_id?: string | null };
type ProjectWorkPackageRow = { id: string; name: string; status: string };

function ProjectExecutionDialog({ project, orgId, canMaterial, canHandover, open, onOpenChange }: { project: ProjectItem | null; orgId?: string; canMaterial: boolean; canHandover: boolean; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [inventoryId, setInventoryId] = useState("");
  const [workPackageId, setWorkPackageId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [materialNotes, setMaterialNotes] = useState("");
  const [qaSummary, setQaSummary] = useState("");
  const [clientSignoff, setClientSignoff] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: inventory = [], refetch: refetchInventory } = useQuery({ queryKey: ["project-execution-inventory", orgId], queryFn: async () => { if (!orgId) return [] as ProjectInventoryRow[]; const { data, error } = await industrialDb.from("inventory").select("id, item_name, quantity_meters, lot_batch, product_specification_id").eq("organization_id", orgId).gt("quantity_meters", 0).order("item_name"); if (error) throw error; return (data ?? []) as ProjectInventoryRow[]; }, enabled: !!orgId && open });
  const { data: workPackages = [] } = useQuery({ queryKey: ["project-work-packages", orgId, project?.id], queryFn: async () => { if (!orgId || !project) return [] as ProjectWorkPackageRow[]; const { data, error } = await industrialDb.from("project_work_packages").select("id, name, status").eq("organization_id", orgId).eq("project_id", project.id).order("sequence_no"); if (error) throw error; return (data ?? []) as ProjectWorkPackageRow[]; }, enabled: !!orgId && !!project && open });
  const { data: handover } = useQuery({ queryKey: ["project-handover", orgId, project?.id], queryFn: async () => { if (!orgId || !project) return null; const { data, error } = await industrialDb.from("project_handover_records").select("id, status, qa_summary, client_signoff, updated_at").eq("organization_id", orgId).eq("project_id", project.id).maybeSingle(); if (error) throw error; return data as { id: string; status: string; qa_summary?: Record<string, unknown>; client_signoff?: Record<string, unknown>; updated_at?: string } | null; }, enabled: !!orgId && !!project && open });

  const consumeMaterial = async () => { if (!orgId || !project || !inventoryId || !quantity || Number(quantity) <= 0) return; setSaving(true); try { const { error } = await industrialDb.rpc("record_project_material_consumption", { _org_id: orgId, _project_id: project.id, _work_package_id: workPackageId || null, _inventory_id: inventoryId, _quantity: Number(quantity), _field_report_id: null, _notes: materialNotes.trim() || null }); if (error) throw error; toast({ title: "Material consumption recorded", description: "Inventory, project consumption, stock movement, and audit history were updated." }); setInventoryId(""); setWorkPackageId(""); setQuantity(""); setMaterialNotes(""); await refetchInventory(); } catch (error) { toast({ title: "Could not record consumption", description: humanizeError(error), variant: "destructive" }); } finally { setSaving(false); } };
  const submitHandover = async () => { if (!orgId || !project || !qaSummary.trim() || !clientSignoff.trim()) return; setSaving(true); try { const { error } = await industrialDb.rpc("submit_project_handover", { _org_id: orgId, _project_id: project.id, _qa_summary: { summary: qaSummary.trim() }, _client_signoff: { note: clientSignoff.trim() } }); if (error) throw error; toast({ title: "Handover submitted", description: "The project is now pending client sign-off." }); setQaSummary(""); setClientSignoff(""); } catch (error) { toast({ title: "Could not submit handover", description: humanizeError(error), variant: "destructive" }); } finally { setSaving(false); } };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl"><DialogHeader><DialogTitle>Project execution · {project?.name ?? "Project"}</DialogTitle></DialogHeader><div className="space-y-5">
    {canMaterial && <section className="space-y-3 rounded-lg border bg-primary/5 p-4"><div><p className="text-sm font-semibold">Record material consumption</p><p className="text-xs text-muted-foreground">Issue available stock to this project through the atomic consumption ledger. Reserved quantities are protected by the server.</p></div><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label>Inventory item *</Label><Select value={inventoryId} onValueChange={setInventoryId}><SelectTrigger><SelectValue placeholder="Select available stock" /></SelectTrigger><SelectContent>{inventory.map((item) => <SelectItem key={item.id} value={item.id}>{item.item_name} · {Number(item.quantity_meters ?? 0).toLocaleString()} available{item.lot_batch ? ` · Lot ${item.lot_batch}` : ""}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Work package</Label><Select value={workPackageId || "none"} onValueChange={(value) => setWorkPackageId(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="Optional work package" /></SelectTrigger><SelectContent><SelectItem value="none">Project-level consumption</SelectItem>{workPackages.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.status}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Quantity *</Label><Input type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="0" /></div><div className="space-y-1"><Label>Reason / notes</Label><Input value={materialNotes} onChange={(event) => setMaterialNotes(event.target.value)} placeholder="Installation issue, field report, or work context" /></div></div><div className="flex justify-end"><Button onClick={() => void consumeMaterial()} disabled={saving || !inventoryId || !quantity}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Record consumption</Button></div></section>}
    {canHandover && <section className="space-y-3 rounded-lg border p-4"><div><p className="text-sm font-semibold">Project handover</p><p className="text-xs text-muted-foreground">Submit explicit QA evidence and client-sign-off notes. Management-defined acceptance criteria remain configurable.</p></div>{handover && <p className="text-xs text-muted-foreground">Current status: <span className="font-medium capitalize">{handover.status.replace("_", " ")}</span> · updated {handover.updated_at ? new Date(handover.updated_at).toLocaleString() : "—"}</p>}<div className="space-y-2"><Label>QA summary *</Label><Textarea rows={3} value={qaSummary} onChange={(event) => setQaSummary(event.target.value)} placeholder="Summarize inspections, fusion records, test evidence, and open defects." /></div><div className="space-y-2"><Label>Client sign-off note *</Label><Textarea rows={3} value={clientSignoff} onChange={(event) => setClientSignoff(event.target.value)} placeholder="Record the client’s sign-off status, representative, date, or outstanding conditions." /></div><div className="flex justify-end"><Button onClick={() => void submitHandover()} disabled={saving || !qaSummary.trim() || !clientSignoff.trim()}>{saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}<ClipboardCheck className="h-4 w-4 mr-1" />Submit for client sign-off</Button></div></section>}
  </div></DialogContent></Dialog>;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  planning: "outline", in_progress: "default", on_hold: "secondary", completed: "default", cancelled: "destructive",
};
const statusLabels: Record<string, string> = {
  planning: "Planning", in_progress: "In Progress", on_hold: "On Hold", completed: "Completed", cancelled: "Cancelled",
};
const allStatuses = ["planning", "in_progress", "on_hold", "completed", "cancelled"];

const Projects = () => {
  const { user, memberships, activeRole, isMaintenance } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [pnlProject, setPnlProject] = useState<ProjectItem | null>(null);
  const [executionProject, setExecutionProject] = useState<ProjectItem | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectItem | null>(null);
  const listRef = useGsapStagger(".gsap-card", 0.06);
  const orgId = memberships[0]?.organization_id;
  const canEdit = ["administrator", "engineer"].includes(activeRole ?? "") || isMaintenance;
  const canDelete = activeRole === "administrator" || isMaintenance;

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newClientId, setNewClientId] = useState("");
  const [newStatus, setNewStatus] = useState("planning");
  const [newProgress, setNewProgress] = useState(0);
  const [newHeadId, setNewHeadId] = useState("");
  const [newTeamIds, setNewTeamIds] = useState<string[]>([]);
  const [newProjectLat, setNewProjectLat] = useState("");
  const [newProjectLng, setNewProjectLng] = useState("");
  const [newRadius, setNewRadius] = useState("500");
  const [projectNameByOrder, setProjectNameByOrder] = useState<Record<string, string>>({});

  const { data: projects = [], isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("projects").select("*, clients(name)").eq("organization_id", orgId).order("created_at", { ascending: false });
      return (data as unknown as ProjectItem[]) ?? [];
    },
    enabled: !!orgId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("clients").select("id, name").eq("organization_id", orgId).order("name");
      return (data as ClientItem[]) ?? [];
    },
    enabled: !!orgId,
  });

  const { data: salesOrdersReady = [] } = useQuery({
    queryKey: ["projects-sales-orders-ready", orgId],
    queryFn: async () => {
      if (!orgId) return [] as IndustrialRow[];
      const { data, error } = await industrialDb.from("sales_orders")
        .select("id, order_number, client_id, total_amount, status, project_id, clients(name), quotations(quotation_number)")
        .eq("organization_id", orgId)
        .in("status", ["confirmed", "partially_fulfilled", "fulfilled"])
        .is("project_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as IndustrialRow[];
    },
    enabled: !!orgId,
  });

  const createProjectFromOrder = useMutation({
    mutationFn: async ({ order, name }: { order: IndustrialRow; name: string }) => {
      if (!orgId || !name.trim()) throw new Error("Enter a project name.");
      const { error } = await industrialDb.rpc("create_project_from_sales_order", { _org_id: orgId, _order_id: order.id, _name: name.trim(), _description: `Created from sales order ${order.order_number}` });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: "Project created from sales order", description: `${variables.order.order_number} is now linked to the project.` });
      setProjectNameByOrder((state) => ({ ...state, [variables.order.id]: "" }));
      queryClient.invalidateQueries({ queryKey: ["projects", orgId] });
      queryClient.invalidateQueries({ queryKey: ["projects-sales-orders-ready", orgId] });
    },
    onError: (err: Error) => toast({ title: "Could not create project", description: humanizeError(err), variant: "destructive" }),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-for-projects", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").eq("organization_id", orgId).order("full_name");
      return (data as MemberItem[]) ?? [];
    },
    enabled: !!orgId,
  });

  const openEdit = (p: ProjectItem) => {
    setEditingProject(p);
    setNewName(p.name); setNewDesc(p.description ?? ""); setNewBudget(p.budget?.toString() ?? "");
    setNewStart(p.start_date ?? ""); setNewEnd(p.end_date ?? ""); setNewClientId(p.client_id ?? "");
    setNewStatus(p.status); setNewProgress(p.progress_percent ?? 0); setNewHeadId(p.project_head_id ?? "");
    setNewTeamIds(Array.isArray(p.team_member_ids) ? (p.team_member_ids as unknown as string[]) : []);
    setNewProjectLat(p.project_lat?.toString() ?? ""); setNewProjectLng(p.project_lng?.toString() ?? "");
    setNewRadius(p.radius_meters?.toString() ?? "500");
    setDialogOpen(true);
  };

  const handleExport = () => {
    exportCsv(`projects-${new Date().toISOString().slice(0, 10)}`, [
      { header: "Project", value: (p: ProjectItem) => p.name },
      { header: "Client", value: (p: ProjectItem) => p.clients?.name ?? "" },
      { header: "Status", value: (p: ProjectItem) => p.status },
      { header: "Budget (₦)", value: (p: ProjectItem) => Number(p.budget ?? 0).toLocaleString() },
      { header: "Progress (%)", value: (p: ProjectItem) => p.progress_percent ?? "" },
      { header: "Start", value: (p: ProjectItem) => csvDate(p.start_date) },
      { header: "End", value: (p: ProjectItem) => csvDate(p.end_date) },
    ], projects);
  };

  const openAdd = () => {
    setEditingProject(null);
    setNewName(""); setNewDesc(""); setNewBudget(""); setNewStart(""); setNewEnd(""); setNewClientId("");
    setNewStatus("planning"); setNewProgress(0); setNewHeadId(""); setNewTeamIds([]);
    setNewProjectLat(""); setNewProjectLng(""); setNewRadius("500");
    setDialogOpen(true);
  };

  const toggleTeamMember = (userId: string) => {
    setNewTeamIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !user || !newName.trim()) throw new Error("Missing required fields");
      const payload: Database["public"]["Tables"]["projects"]["Insert"] = {
        organization_id: orgId, created_by: user.id,
        name: newName, description: newDesc || null, budget: newBudget ? parseFloat(newBudget) : null,
        start_date: newStart || null, end_date: newEnd || null, client_id: newClientId || null,
        status: newStatus as "planning" | "in_progress" | "on_hold" | "completed" | "cancelled", progress_percent: newProgress, project_head_id: newHeadId || null,
        team_member_ids: newTeamIds.length > 0 ? newTeamIds : null,
        project_lat: newProjectLat ? parseFloat(newProjectLat) : null,
        project_lng: newProjectLng ? parseFloat(newProjectLng) : null,
        radius_meters: newRadius ? parseInt(newRadius) : 500,
      };

      let projectId: string;
      if (editingProject) {
        const { error } = await supabase.from("projects").update(payload as Database["public"]["Tables"]["projects"]["Update"]).eq("id", editingProject.id);
        if (error) throw error;
        projectId = editingProject.id;
      } else {
        const { data, error } = await supabase.from("projects").insert(payload).select("id").single();
        if (error) throw error;
        projectId = data.id;
      }

      // Auto-create project group chat when head is assigned
      if (newHeadId && projectId) {
        const { data: existingChat } = await supabase.from("messages")
          .select("id")
          .eq("context_type", "project")
          .eq("context_id", projectId)
          .limit(1);

        if (!existingChat || existingChat.length === 0) {
          await supabase.from("messages").insert({
            organization_id: orgId,
            sender_id: user.id,
            subject: `Project: ${newName}`,
            body: `Project group chat created. Project head has been assigned.`,
            message_type: "context",
            context_type: "project",
            context_id: projectId,
          });
        }
      }
    },
    onSuccess: () => {
      toast({ title: editingProject ? "Project updated" : "Project created" });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: humanizeError(err), variant: "destructive" }),
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("projects").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Project deleted" });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error", description: humanizeError(error), variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from("projects").update({ status: status as "planning" | "in_progress" | "on_hold" | "completed" | "cancelled" }).eq("id", id);
      if (error) throw error;
      toast({ title: `Status → ${statusLabels[status]}` });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error", description: humanizeError(error), variant: "destructive" });
    }
  };

  const filtered = projects.filter((p: ProjectItem) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.clients?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getMemberName = (userId: string) => members.find((m: MemberItem) => m.user_id === userId)?.full_name ?? "Unknown";

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Projects"
        description="Track installation projects and site work"
        executiveSummary={`${projects.filter((p: any) => p.status === "in_progress").length} active · ${projects.filter((p: any) => p.status === "completed").length} completed of ${projects.length} total`}
        lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
        onRefresh={() => refetch()}
      >
        <Button size="sm" variant="outline" onClick={handleExport} disabled={projects.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
        {canEdit && <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> New Project</Button>}
      </PageHeader>

      <WorkflowBanner
        storageKey="projects-overview"
        title="How projects flow"
        summary="Admin or Engineering creates the project, assigns a Project Head and team, sets site GPS coordinates, and adds a budget. The head updates progress; field reports, deliveries, requisitions and expenses all link back here. P&L is computed live from those linked records."
        steps={[
          { actor: "Admin / Engineer", action: "Creates the project, sets client, budget, site GPS and assigns a head + team." },
          { actor: "Project Head", action: "Updates status & progress; team checks in on site and submits field reports." },
          { actor: "System", action: "Auto-links materials, deliveries and expenses; calculates project P&L on demand." },
        ]}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2"><Label>Project Name *</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Lekki Phase 2 Water Supply" /></div>
              <div className="space-y-2"><Label>Client</Label>
                <Select value={newClientId} onValueChange={setNewClientId}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map((c: ClientItem) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Budget (₦)</Label><Input type="number" value={newBudget} onChange={e => setNewBudget(e.target.value)} placeholder="0" /></div>
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} /></div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{allStatuses.map(s => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Progress: {newProgress}%</Label>
                <Slider value={[newProgress]} onValueChange={([v]) => setNewProgress(v)} max={100} step={5} className="mt-2" />
              </div>
              <div className="space-y-2 sm:col-span-2"><Label>Project Head</Label>
                <Select value={newHeadId} onValueChange={setNewHeadId}><SelectTrigger><SelectValue placeholder="Assign project head" /></SelectTrigger>
                  <SelectContent>{members.map((m: MemberItem) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name ?? "Unknown"}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {/* Team Members Multi-Select */}
              <div className="space-y-2 sm:col-span-2">
                <Label className="flex items-center gap-1"><Users className="h-4 w-4" /> Team Members</Label>
                <div className="border border-border rounded-md p-3 max-h-40 overflow-y-auto space-y-1">
                  {members.length === 0 ? <p className="text-xs text-muted-foreground">No members available</p> : members.map((m: MemberItem) => (
                    <div key={m.user_id} className="flex items-center gap-2">
                      <Checkbox
                        id={`team-${m.user_id}`}
                        checked={newTeamIds.includes(m.user_id)}
                        onCheckedChange={() => toggleTeamMember(m.user_id)}
                      />
                      <label htmlFor={`team-${m.user_id}`} className="text-sm cursor-pointer">{m.full_name ?? "Unknown"}</label>
                    </div>
                  ))}
                </div>
                {newTeamIds.length > 0 && <p className="text-xs text-muted-foreground">{newTeamIds.length} member(s) selected</p>}
              </div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Project scope..." rows={3} /></div>
            {/* Project Site GPS for Check-In */}
            <div className="space-y-2 border-t border-border pt-3">
              <Label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> Site GPS (for Check-In)</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label className="text-xs">Latitude</Label><Input type="number" step="any" value={newProjectLat} onChange={e => setNewProjectLat(e.target.value)} placeholder="e.g. 6.5520" /></div>
                <div className="space-y-1"><Label className="text-xs">Longitude</Label><Input type="number" step="any" value={newProjectLng} onChange={e => setNewProjectLng(e.target.value)} placeholder="e.g. 3.3670" /></div>
                <div className="space-y-1"><Label className="text-xs">Radius (m)</Label><Input type="number" value={newRadius} onChange={e => setNewRadius(e.target.value)} placeholder="500" /></div>
              </div>
              <p className="text-[10px] text-muted-foreground">Workers assigned here can check in from this site location</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!newName.trim() || saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingProject ? "Update" : "Create"} Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {canEdit && salesOrdersReady.length > 0 && <Card className="border-primary/20 bg-primary/5"><CardContent className="p-4 space-y-3"><div><p className="text-sm font-semibold">Sales orders ready for project planning</p><p className="text-xs text-muted-foreground">Confirmed order records are shown here so the project team can create the linked execution record without re-keying the client, budget, or order reference.</p></div>{salesOrdersReady.map((order) => <div key={order.id} className="flex flex-col gap-2 rounded-lg border bg-background/70 p-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><p className="text-sm font-medium">{order.order_number} · {order.clients?.name ?? "Client"}</p><p className="text-xs text-muted-foreground">{formatCurrency(Number(order.total_amount ?? 0))} · {order.quotations?.quotation_number ?? "No quotation reference"}</p></div><div className="flex w-full gap-2 lg:w-auto"><Input value={projectNameByOrder[order.id] ?? ""} onChange={(e) => setProjectNameByOrder((state) => ({ ...state, [order.id]: e.target.value }))} placeholder="Project name" className="min-w-0" /><Button size="sm" onClick={() => createProjectFromOrder.mutate({ order, name: projectNameByOrder[order.id] ?? "" })} disabled={createProjectFromOrder.isPending}>{createProjectFromOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create linked project"}</Button></div></div>)}</CardContent></Card>}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search projects..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {allStatuses.map(s => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={!!pnlProject} onOpenChange={() => setPnlProject(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Profit & Loss: {pnlProject?.name}</DialogTitle>
          </DialogHeader>
          {pnlProject && <ProjectPnL projectId={pnlProject.id} projectBudget={pnlProject.budget || 0} />}
        </DialogContent>
      </Dialog>

      <ProjectExecutionDialog project={executionProject} orgId={orgId} canMaterial={isMaintenance || ["administrator", "engineer", "technician"].includes(activeRole ?? "")} canHandover={isMaintenance || ["administrator", "engineer", "finance"].includes(activeRole ?? "")} open={!!executionProject} onOpenChange={(isOpen) => !isOpen && setExecutionProject(null)} />

      <AsyncBoundary
        loading={isLoading}
        error={error}
        onRetry={() => refetch()}
        isEmpty={filtered.length === 0}
        loadingVariant="cards"
        loadingRows={4}
        emptyState={{
          title: projects.length === 0 ? "No projects created yet" : "No projects match your filters",
          description: projects.length === 0
            ? "Projects organise everything — field reports, deliveries, material requisitions, expenses and P&L all attach to a project. Create your first one to get started."
            : "Try clearing the search or selecting a different status.",
          ownedBy: "Created by Admin or Engineering; updated by the assigned Project Head.",
          action: canEdit && projects.length === 0 ? { label: "Create First Project", onClick: openAdd } : undefined,
          secondaryAction: projects.length > 0 ? { label: "Clear filters", onClick: () => { setSearch(""); setStatusFilter("all"); } } : undefined,
        }}
      >
      <div ref={listRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((project: ProjectItem) => {
          const teamIds: string[] = Array.isArray(project.team_member_ids) ? project.team_member_ids as string[] : [];
          return (
            <Card key={project.id} className="gsap-card border-border/50 hover:border-primary/20 transition-all hover:shadow-md">
              <CardContent className="pt-5 pb-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{project.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{project.clients?.name ?? "No client"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={statusColors[project.status]} className="capitalize shrink-0 text-xs">{statusLabels[project.status] ?? project.status}</Badge>
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPnlProject(project)}><BarChart3 className="h-3.5 w-3.5 mr-2" />View P&L</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setExecutionProject(project)}><ClipboardCheck className="h-3.5 w-3.5 mr-2" />Execution & handover</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEdit(project)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {allStatuses.filter(s => s !== project.status).map(s => (
                            <DropdownMenuItem key={s} onClick={() => handleStatusChange(project.id, s)}>{statusLabels[s]}</DropdownMenuItem>
                          ))}
                          {canDelete && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(project)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem></>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{project.progress_percent ?? 0}%</span>
                  </div>
                  <Progress value={project.progress_percent ?? 0} className="h-1.5" />
                </div>
                {(project.project_head_id || teamIds.length > 0) && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {project.project_head_id && <p><span className="font-medium text-foreground">Head:</span> {getMemberName(project.project_head_id)}</p>}
                    {teamIds.length > 0 && <p><span className="font-medium text-foreground">Team:</span> {teamIds.map(id => getMemberName(id)).join(", ")}</p>}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-1">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {project.start_date ?? "—"}</span>
                  <span className="font-semibold text-foreground">{project.budget ? formatCurrency(project.budget) : "—"}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      </AsyncBoundary>
    </div>
  );
};

export default Projects;
