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
import { Plus, Search, Calendar, Loader2, MoreVertical, Pencil, Trash2, Users, MapPin } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useGsapStagger } from "@/hooks/useGsapAnimation";
import { formatCurrency } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type ProjectItem = Database["public"]["Tables"]["projects"]["Row"] & { clients?: { name: string } | null };
type ClientItem = { id: string; name: string };
type MemberItem = { user_id: string; full_name: string | null };

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectItem | null>(null);
  const listRef = useGsapStagger(".gsap-card", 0.06);
  const orgId = memberships[0]?.organization_id;
  const canEdit = ["administrator", "engineer", "technician", "finance"].includes(activeRole ?? "") || isMaintenance;
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

  const { data: projects = [], isLoading } = useQuery({
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
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      <PageHeader title="Projects" description="Track installation projects and site work">
        {canEdit && <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> New Project</Button>}
      </PageHeader>

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

      {isLoading && <p className="text-sm text-muted-foreground">Loading projects...</p>}

      <div ref={listRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.length === 0 && !isLoading && (
          <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No projects found.</CardContent></Card>
        )}
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
    </div>
  );
};

export default Projects;
