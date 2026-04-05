import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Printer, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PrintableDocument, cleanForPrint } from "./PrintableDocument";

interface PrintRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTitle: string;
  documentContent?: string;
  documentId?: string;
  documentType?: string;
}

export const PrintRequestDialog = ({
  open, onOpenChange, documentTitle, documentContent, documentId, documentType = "report",
}: PrintRequestDialogProps) => {
  const { user, memberships } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = memberships[0]?.organization_id;
  const [stampType, setStampType] = useState<string>("");

  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!orgId || !user) throw new Error("Not authenticated");
      // Clean markdown before storing
      const cleanContent = documentContent ? cleanForPrint(documentContent) : null;
      const { error } = await supabase.from("print_requests").insert({
        organization_id: orgId,
        requested_by: user.id,
        document_type: documentType,
        document_id: documentId || null,
        document_title: documentTitle,
        document_content: cleanContent,
        stamp_type: stampType || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Print request sent", description: "Receptionist will review and approve." });
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["print-requests"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" /> Request Print Approval
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Document</Label>
            <Input value={documentTitle} disabled />
          </div>
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Input value={documentType.replace(/_/g, " ")} disabled className="capitalize" />
          </div>
          <div className="space-y-2">
            <Label>Stamp Type (Optional)</Label>
            <Select value={stampType} onValueChange={setStampType}>
              <SelectTrigger><SelectValue placeholder="No stamp" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Company Seal</SelectItem>
                <SelectItem value="hr">HR Approved</SelectItem>
                <SelectItem value="finance">Finance Verified</SelectItem>
                <SelectItem value="admin">Admin Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            This request goes to the Receptionist for approval. Approved documents get professional formatting with letterhead, stamps, and signature blocks.
          </p>
          <Button className="w-full" onClick={() => submitRequest.mutate()} disabled={submitRequest.isPending}>
            {submitRequest.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send Print Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Receptionist inbox for print requests
export const PrintRequestsInbox = () => {
  const { user, memberships } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = memberships[0]?.organization_id;

  const { data: requests = [] } = useQuery({
    queryKey: ["print-requests", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("print_requests").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const requesterIds = [...new Set(requests.map((r: any) => r.requested_by))];
  const { data: requesterProfiles = new Map() } = useQuery({
    queryKey: ["print-requester-profiles", requesterIds.join(",")],
    queryFn: async () => {
      if (requesterIds.length === 0) return new Map();
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", requesterIds);
      return new Map((data ?? []).map((p: any) => [p.user_id, p.full_name]));
    },
    enabled: requesterIds.length > 0,
  });

  // Get roles for sender metadata
  const { data: requesterRoles = new Map() } = useQuery({
    queryKey: ["print-requester-roles", requesterIds.join(",")],
    queryFn: async () => {
      if (requesterIds.length === 0) return new Map();
      const { data } = await supabase.from("organization_memberships").select("user_id, role").in("user_id", requesterIds);
      return new Map((data ?? []).map((m: any) => [m.user_id, m.role]));
    },
    enabled: requesterIds.length > 0,
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("print_requests").update({
        status, approved_by: user?.id, updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast({ title: `Request ${status}` });
      queryClient.invalidateQueries({ queryKey: ["print-requests"] });
    },
  });

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    approved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  const docTypeLabels: Record<string, string> = {
    field_report: "📋 Field Report",
    worker_claim: "💰 Worker Claim",
    project_summary: "🏗️ Project Summary",
    financial_log: "📊 Financial Log",
    report: "📄 Report",
  };

  return (
    <div className="space-y-3">
      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No print requests.</p>
      ) : (
        requests.map((r: any) => {
          const senderName = requesterProfiles.get(r.requested_by) ?? "Unknown";
          const senderRole = requesterRoles.get(r.requested_by) ?? "";
          return (
            <div key={r.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.document_title}</p>
                  <p className="text-xs text-muted-foreground">
                    From: {senderName} ({senderRole}) · {new Date(r.created_at).toLocaleString()}
                  </p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{docTypeLabels[r.document_type] ?? r.document_type}</Badge>
                    {r.stamp_type && <Badge variant="outline" className="text-[10px] capitalize">{r.stamp_type} stamp</Badge>}
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[r.status] ?? ""}`}>{r.status}</Badge>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs text-primary" onClick={() => updateRequest.mutate({ id: r.id, status: "approved" })}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />Approve & Stamp
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => updateRequest.mutate({ id: r.id, status: "rejected" })}>
                    <XCircle className="h-3 w-3 mr-1" />Reject
                  </Button>
                </div>
              )}
              {r.status === "approved" && (
                <PrintableDocument
                  title={r.document_title}
                  documentId={r.id.substring(0, 8).toUpperCase()}
                  stampType={r.stamp_type}
                  senderName={senderName}
                  senderDepartment={senderRole}
                  timestamp={r.created_at}
                >
                  <div>
                    {(r.document_content || "Document content not available.")
                      .split("\n")
                      .map((line: string, i: number) => (
                        <p key={i} style={{ marginBottom: line.trim() ? "6px" : "12px" }}>{line}</p>
                      ))}
                  </div>
                </PrintableDocument>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
