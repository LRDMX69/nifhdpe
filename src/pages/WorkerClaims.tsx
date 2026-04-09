import { useState, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Clock, CheckCircle2, XCircle, Loader2, FileDown, Upload, AlertTriangle, Eye, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/constants";

const claimCategories = [
  "Personal Funds Used", "Equipment Purchase", "Fuel Expense",
  "Overtime Work", "Transport Cost", "Operational Complaint", "Safety Issue", "Other",
];

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-warning" />,
  flagged: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  approved: <CheckCircle2 className="h-4 w-4 text-primary" />,
  rejected: <XCircle className="h-4 w-4 text-destructive" />,
};

const WorkerClaims = () => {
  const { user, activeRole, memberships, isMaintenance } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const orgId = memberships[0]?.organization_id;
  const isAdmin = activeRole === "administrator" || isMaintenance;
  const isFinance = activeRole === "finance";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [claimType, setClaimType] = useState("expense");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ["worker-claims", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("worker_claims")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: profileMap = new Map() } = useQuery({
    queryKey: ["profiles-claims", orgId],
    queryFn: async () => {
      if (!orgId) return new Map();
      const { data } = await supabase.from("profiles").select("user_id, full_name, avatar_url").eq("organization_id", orgId);
      return new Map((data ?? []).map((p: any) => [p.user_id, p]));
    },
    enabled: !!orgId && (isAdmin || isFinance),
  });

  const { data: membershipMap = new Map() } = useQuery({
    queryKey: ["memberships-claims", orgId],
    queryFn: async () => {
      if (!orgId) return new Map();
      const { data } = await supabase.rpc("get_visible_members", { _org_id: orgId });
      return new Map((data ?? []).map((m: any) => [m.user_id, m.role]));
    },
    enabled: !!orgId && (isAdmin || isFinance),
  });

  const submitClaim = useMutation({
    mutationFn: async () => {
      if (!user || !orgId) throw new Error("Not authenticated");
      if (!selectedFile) throw new Error("Proof file is required. Please upload a receipt, photo or document.");

      // Upload file first
      const ext = selectedFile.name.split(".").pop() || "jpg";
      const filePath = `${orgId}/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("claim-attachments")
        .upload(filePath, selectedFile);
      if (uploadErr) throw new Error("File upload failed: " + uploadErr.message);

      const { data: urlData } = supabase.storage
        .from("claim-attachments")
        .getPublicUrl(filePath);

      const fileUrl = urlData?.publicUrl || filePath;

      const { error } = await supabase.from("worker_claims").insert({
        organization_id: orgId,
        user_id: user.id,
        claim_type: claimType,
        category,
        amount: amount ? parseFloat(amount) : 0,
        description,
        file_url: fileUrl,
        uploaded_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Claim submitted", description: "Your claim with proof has been sent for review." });
      setOpen(false);
      setCategory("");
      setAmount("");
      setDescription("");
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["worker-claims"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateClaim = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("worker_claims").update({ status, reviewed_by: user?.id } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Claim updated" });
      queryClient.invalidateQueries({ queryKey: ["worker-claims"] });
    },
  });

  const handleExportClaim = async (c: any) => {
    const { generatePdf } = await import("@/lib/generatePdf");
    const claimProfile = profileMap.get(c.user_id);
    generatePdf({
      title: `Worker Claim — ${c.category}`,
      senderName: claimProfile?.full_name ?? "Employee",
      contentSections: [
        { heading: "Claim Details", bullets: [
          `Type: ${c.claim_type}`,
          `Category: ${c.category}`,
          `Amount: ${formatCurrency(c.amount ?? 0)}`,
          `Status: ${c.status}`,
          `Date Submitted: ${new Date(c.created_at).toLocaleDateString()}`,
          ...(c.file_url ? [`Proof: Attached`] : [`Proof: None`]),
        ]},
        ...(c.description ? [{ heading: "Description", body: c.description }] : []),
        ...(c.admin_notes ? [{ heading: "Admin Notes", body: c.admin_notes }] : []),
      ],
      stampType: c.status === "approved" ? "admin" : null,
      showSignature: true,
    });
  };

  const pendingCount = claims.filter((c: any) => c.status === "pending" || c.status === "flagged").length;
  const totalAmount = claims.filter((c: any) => c.status === "approved").reduce((s: number, c: any) => s + (c.amount || 0), 0);

  const getInitials = (name: string) => (name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2);

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Claims & Issues" description={isAdmin ? "Review and manage worker claims" : "Submit expenses, overtime, and operational issues"}>
        {!isAdmin && !isFinance && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Claim</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Submit a Claim</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={claimType} onValueChange={setClaimType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="overtime">Overtime</SelectItem>
                        <SelectItem value="complaint">Complaint</SelectItem>
                        <SelectItem value="issue">Issue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₦)</Label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{claimCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the expense or issue..." rows={3} />
                </div>
                {/* File upload - REQUIRED */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Upload className="h-3.5 w-3.5" /> Proof (Required) *
                  </Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  />
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {selectedFile ? (
                      <div className="flex items-center gap-2 justify-center">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="text-sm text-primary font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Tap to upload receipt, photo or document</p>
                      </div>
                    )}
                  </div>
                  {!selectedFile && <p className="text-xs text-destructive">A proof file is required to submit a claim</p>}
                </div>
                <Button className="w-full" onClick={() => submitClaim.mutate()} disabled={!category || !selectedFile || submitClaim.isPending}>
                  {submitClaim.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Submit Claim
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {/* Preview dialog for attachments */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Claim Proof</DialogTitle></DialogHeader>
          {previewUrl && (
            isImageUrl(previewUrl) ? (
              <img src={previewUrl} alt="Claim proof" className="w-full rounded-lg max-h-[60vh] object-contain" />
            ) : (
              <div className="text-center py-8 space-y-3">
                <p className="text-sm text-muted-foreground">Document attached</p>
                <Button asChild><a href={previewUrl} target="_blank" rel="noopener noreferrer">Open Document</a></Button>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-muted-foreground">Pending/Flagged</p><p className="text-2xl font-bold text-warning">{pendingCount}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-muted-foreground">Total Claims</p><p className="text-2xl font-bold">{claims.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-muted-foreground">Approved Total</p><p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p></CardContent></Card>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading claims...</p>}
        {claims.length === 0 && !isLoading && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No claims yet.</CardContent></Card>
        )}
        {claims.map((c: any) => {
          const claimProfile = profileMap.get(c.user_id);
          const claimRole = membershipMap.get(c.user_id);
          return (
            <Card key={c.id} className={`hover:border-primary/20 transition-colors ${c.status === "flagged" ? "border-orange-500/40 bg-orange-500/5" : ""}`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-1 flex-1 min-w-0">
                    {(isAdmin || isFinance) && claimProfile && (
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-7 w-7 shrink-0">
                          {claimProfile.avatar_url && <AvatarImage src={claimProfile.avatar_url} />}
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(claimProfile.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate">{claimProfile.full_name}</span>
                        {claimRole && <Badge variant="outline" className="text-[10px] capitalize shrink-0">{claimRole}</Badge>}
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusIcons[c.status] || statusIcons.pending}
                      <span className="font-medium text-sm">{c.category}</span>
                      <Badge variant="outline" className="text-xs capitalize">{c.claim_type}</Badge>
                      {c.status === "flagged" && <Badge variant="destructive" className="text-[10px]">⚠ Flagged</Badge>}
                    </div>
                    {c.description && <p className="text-sm text-muted-foreground break-words">{c.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      {c.file_url && (
                        <button onClick={() => setPreviewUrl(c.file_url)} className="flex items-center gap-1 text-primary hover:underline">
                          <Eye className="h-3 w-3" /> View Proof
                        </button>
                      )}
                      {!c.file_url && (isAdmin || isFinance) && (
                        <span className="text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> No proof attached</span>
                      )}
                    </div>
                    {(isAdmin || isFinance) && c.uploaded_at && (
                      <p className="text-[10px] text-muted-foreground">
                        Upload: {new Date(c.uploaded_at).toLocaleString()} | Claim: {new Date(c.created_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-2 shrink-0">
                    {c.amount > 0 && <p className="font-bold text-sm">{formatCurrency(c.amount)}</p>}
                    <div className="flex gap-1 flex-wrap justify-end">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleExportClaim(c)}>
                        <FileDown className="h-3 w-3 mr-1" />PDF
                      </Button>
                      {(isAdmin || isFinance) && (c.status === "pending" || c.status === "flagged") && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-primary" onClick={() => updateClaim.mutate({ id: c.id, status: "approved" })}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => updateClaim.mutate({ id: c.id, status: "rejected" })}>
                            <XCircle className="h-3 w-3 mr-1" />Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default WorkerClaims;
