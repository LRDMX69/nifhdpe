import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CheckCircle2, Clock, AlertTriangle, Loader2, Upload, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useGsapAnimation } from "@/hooks/useGsapAnimation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<string, { icon: typeof CheckCircle2; class: string }> = {
  valid: { icon: CheckCircle2, class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  pending: { icon: Clock, class: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  expired: { icon: AlertTriangle, class: "bg-red-500/10 text-red-400 border-red-500/20" },
};
const allCStatuses = ["pending", "valid", "expired"];

const Compliance = () => {
  const { user, memberships, activeRole, isMaintenance } = useAuth();
  const { toast } = useToast();
  const orgId = memberships[0]?.organization_id;
  const canEdit = activeRole === "administrator" || activeRole === "engineer" || isMaintenance;
  const canDelete = activeRole === "administrator" || isMaintenance;
  const [open, setOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const containerRef = useGsapAnimation("slideUp");

  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [docStatus, setDocStatus] = useState("pending");

  const { data: docs = [], isLoading, refetch } = useQuery({
    queryKey: ["compliance-docs", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from("compliance_documents").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("projects").select("id, name").eq("organization_id", orgId);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const openEdit = (d: any) => {
    setEditingDoc(d);
    setTitle(d.title); setDocType(d.doc_type); setExpiryDate(d.expiry_date ?? "");
    setProjectId(d.project_id ?? ""); setFileUrl(d.file_url); setDocStatus(d.status);
    setOpen(true);
  };

  const openAdd = () => {
    setEditingDoc(null);
    setTitle(""); setDocType(""); setExpiryDate(""); setProjectId(""); setFileUrl(null); setDocStatus("pending");
    setOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    setUploading(true);
    try {
      const filePath = `${orgId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("compliance-docs").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("compliance-docs").getPublicUrl(filePath);
      setFileUrl(urlData.publicUrl);
      toast({ title: "File uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const handleSubmit = async () => {
    if (!orgId || !user || !title.trim() || !docType) return;
    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(), doc_type: docType, expiry_date: expiryDate || null,
        project_id: projectId && projectId !== "none" ? projectId : null,
        file_url: fileUrl, status: docStatus as any,
      };
      if (editingDoc) {
        const { error } = await supabase.from("compliance_documents").update(payload).eq("id", editingDoc.id);
        if (error) throw error;
        toast({ title: "Document updated" });
      } else {
        const { error } = await supabase.from("compliance_documents").insert({ ...payload, organization_id: orgId, created_by: user.id });
        if (error) throw error;
        toast({ title: "Document added" });
      }
      setOpen(false); refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from("compliance_documents").update({ status: status as any }).eq("id", id);
      if (error) throw error;
      toast({ title: `Status → ${status}` });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("compliance_documents").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Document deleted" });
      setDeleteTarget(null); refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const validCount = docs.filter(d => d.status === "valid").length;
  const pendingCount = docs.filter(d => d.status === "pending").length;
  const expiredCount = docs.filter(d => d.status === "expired").length;

  if (isLoading) return <div className="p-6 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div ref={containerRef} className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Compliance" description="Certificates, inspections, and regulatory documents">
        {canEdit && <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Document</Button>}
      </PageHeader>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingDoc ? "Edit Document" : "Add Compliance Document"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input placeholder="Document title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type *</Label>
                <Select value={docType} onValueChange={setDocType}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{["Pressure Test", "Material Cert", "Inspection", "Regulatory", "Other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Expiry Date</Label><Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">General</SelectItem>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={docStatus} onValueChange={setDocStatus}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{allCStatuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Upload File</Label>
              <label className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors block">
                {uploading ? <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-2" /> : fileUrl ? <CheckCircle2 className="h-8 w-8 mx-auto text-primary mb-2" /> : <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />}
                <p className="text-sm text-muted-foreground">{fileUrl ? "File uploaded ✓" : "Click to upload"}</p>
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.jpg,.png" />
              </label>
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{editingDoc ? "Update" : "Add"} Document</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Valid", value: validCount, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Pending", value: pendingCount, icon: Clock, color: "text-amber-400" },
          { label: "Expired", value: expiredCount, icon: AlertTriangle, color: "text-red-400" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></div>
              <s.icon className={`h-8 w-8 ${s.color} opacity-60`} />
            </div>
          </CardContent></Card>
        ))}
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          {docs.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">No compliance documents yet.</p>
          ) : (
            <Table><TableHeader><TableRow>
              <TableHead>Document</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Expiry</TableHead><TableHead className="w-[50px]"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {docs.map(d => {
                const cfg = statusConfig[d.status] ?? statusConfig.pending;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-sm">
                      {d.file_url ? (
                        <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{d.title}</a>
                      ) : d.title}
                    </TableCell>
                    <TableCell><Badge variant="outline">{d.doc_type}</Badge></TableCell>
                    <TableCell><Badge className={cfg.class} variant="outline">{d.status}</Badge></TableCell>
                    <TableCell className="text-sm">{d.expiry_date ?? "—"}</TableCell>
                    <TableCell>
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {allCStatuses.filter(s => s !== d.status).map(s => (
                              <DropdownMenuItem key={s} onClick={() => handleStatusChange(d.id, s)} className="capitalize">{s}</DropdownMenuItem>
                            ))}
                            {canDelete && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(d)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem></>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody></Table>
          )}
        </div>
      </CardContent></Card>
    </div>
  );
};

export default Compliance;
