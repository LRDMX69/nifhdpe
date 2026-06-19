import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronRight, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AttentionItem {
  id: string;
  label: string;
  detail: string;
  to: string;
  severity?: "warning" | "destructive" | "default";
}

/**
 * Universal "what needs your action right now" queue shown at the
 * top of every role's dashboard. Aggregates pending items the
 * current active role is responsible for and deep-links them.
 */
export function NeedsAttentionPanel() {
  const { user, activeRole, memberships, isMaintenance } = useAuth();
  const orgId = memberships[0]?.organization_id;
  const role = activeRole ?? (isMaintenance ? "administrator" : undefined);

  const { data: items = [] } = useQuery({
    queryKey: ["needs-attention", orgId, role, user?.id],
    enabled: !!orgId && !!role,
    queryFn: async (): Promise<AttentionItem[]> => {
      const out: AttentionItem[] = [];
      const client = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (k: string, v: string[]) => { limit: (n: number) => Promise<{ data: any[] | null }> };
            eq: (k: string, v: string) => { limit: (n: number) => Promise<{ data: any[] | null }>; eq: (k2: string, v2: string) => { limit: (n: number) => Promise<{ data: any[] | null }> } };
          };
        };
      };

      // Reviewer queues
      if (role === "administrator" || role === "finance") {
        const { data: claims } = await client
          .from("worker_claims")
          .select("id, category, amount, status")
          .in("status", ["pending", "flagged"])
          .limit(5);
        (claims ?? []).forEach((c) =>
          out.push({
            id: `claim-${c.id}`,
            label: `Claim: ${c.category}`,
            detail: c.status === "flagged" ? "AI flagged — review carefully" : "Pending review",
            to: "/claims",
            severity: c.status === "flagged" ? "destructive" : "warning",
          }),
        );
        // Overdue invoices — admin & finance
        const today = new Date().toISOString().slice(0, 10);
        const { data: overdue } = await (supabase as any)
          .from("invoices")
          .select("id, document_number, balance_due, due_date, clients(name)")
          .lt("due_date", today)
          .gt("balance_due", 0)
          .neq("status", "paid")
          .order("due_date", { ascending: true })
          .limit(3);
        (overdue ?? []).forEach((inv: any) => {
          const days = Math.ceil((Date.now() - new Date(inv.due_date).getTime()) / 86400000);
          out.push({
            id: `inv-${inv.id}`,
            label: `Overdue invoice: ${inv.clients?.name ?? inv.document_number}`,
            detail: `${days}d late · ₦${Number(inv.balance_due ?? 0).toLocaleString()} outstanding`,
            to: "/finance?tab=invoices",
            severity: days > 30 ? "destructive" : "warning",
          });
        });
      }

      if (role === "administrator" || role === "hr") {
        const { data: leaves } = await client
          .from("leave_requests")
          .select("id, leave_type, start_date, status")
          .eq("status", "pending")
          .limit(5);
        (leaves ?? []).forEach((l) =>
          out.push({
            id: `leave-${l.id}`,
            label: `Leave: ${l.leave_type}`,
            detail: `Starts ${l.start_date}`,
            to: "/hr",
            severity: "warning",
          }),
        );
      }

      if (role === "administrator" || role === "warehouse") {
        const { data: reqs } = await client
          .from("equipment_requests")
          .select("id, reason, status")
          .eq("status", "pending")
          .limit(5);
        (reqs ?? []).forEach((r) =>
          out.push({
            id: `eq-${r.id}`,
            label: "Equipment request",
            detail: r.reason ?? "Awaiting approval",
            to: "/equipment",
            severity: "warning",
          }),
        );
      }

      if (role === "administrator") {
        const { data: pendingUsers } = await client
          .from("role_assignment_requests")
          .select("id, status")
          .eq("status", "pending")
          .limit(5);
        (pendingUsers ?? []).forEach((u) =>
          out.push({
            id: `role-${u.id}`,
            label: "Pending user approval",
            detail: "Assign role to grant access",
            to: "/settings",
            severity: "destructive",
          }),
        );
        // Compliance docs expiring within 30 days
        const today = new Date();
        const horizon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
        const { data: docs } = await (supabase as any)
          .from("compliance_documents")
          .select("id, title, expiry_date")
          .not("expiry_date", "is", null)
          .lte("expiry_date", horizon)
          .limit(3);
        (docs ?? []).forEach((d: any) => {
          const daysLeft = Math.ceil((new Date(d.expiry_date).getTime() - today.getTime()) / 86400000);
          out.push({
            id: `doc-${d.id}`,
            label: `Compliance: ${d.title}`,
            detail: daysLeft < 0 ? `Expired ${-daysLeft}d ago` : `Expires in ${daysLeft}d`,
            to: "/compliance",
            severity: daysLeft < 0 ? "destructive" : "warning",
          });
        });
      }

      // Sender-side: status of my own submissions
      if (user) {
        const { data: myClaims } = await (supabase as any)
          .from("worker_claims")
          .select("id, category, status")
          .eq("user_id", user.id)
          .in("status", ["rejected", "flagged", "approved"])
          .limit(5);
        (myClaims ?? []).forEach((c: any) =>
          out.push({
            id: `my-claim-${c.id}`,
            label: `Your claim — ${c.category}`,
            detail:
              c.status === "rejected"
                ? "Rejected — open to see the reviewer's note"
                : c.status === "approved"
                ? "Approved — finance will process payment"
                : "Flagged — reviewer needs more info",
            to: "/claims",
            severity: c.status === "approved" ? "default" : c.status === "flagged" ? "warning" : "destructive",
          }),
        );

        // Own leave requests status
        const { data: myLeaves } = await (supabase as any)
          .from("leave_requests")
          .select("id, leave_type, status, start_date")
          .eq("user_id", user.id)
          .in("status", ["approved", "rejected"])
          .order("created_at", { ascending: false })
          .limit(3);
        (myLeaves ?? []).forEach((l: any) => {
          out.push({
            id: `my-leave-${l.id}`,
            label: `Your leave (${l.leave_type})`,
            detail: l.status === "approved" ? `Approved · starts ${l.start_date}` : "Rejected — open HR for details",
            to: "/hr",
            severity: l.status === "approved" ? "default" : "destructive",
          });
        });

        // Own equipment requests status
        const { data: myEqReqs } = await (supabase as any)
          .from("equipment_requests")
          .select("id, status, reason")
          .eq("requested_by", user.id)
          .in("status", ["approved", "denied"])
          .order("updated_at", { ascending: false })
          .limit(3);
        (myEqReqs ?? []).forEach((r: any) => {
          out.push({
            id: `my-eq-${r.id}`,
            label: `Equipment request ${r.status === "approved" ? "approved" : "denied"}`,
            detail: r.reason ?? "Open Equipment for details",
            to: "/equipment",
            severity: r.status === "approved" ? "default" : "destructive",
          });
        });
      }

      return out.slice(0, 12);
    },
  });

  if (!items.length) return null;

  return (
    <Card className="border-warning/30" data-tour="needs-attention">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-warning" /> Needs Your Attention
          <Badge variant="warning" className="ml-auto text-[10px]">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-2">
        {items.map((it) => (
          <Link
            key={it.id}
            to={it.to}
            className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{it.label}</p>
              <p className="text-xs text-muted-foreground truncate">{it.detail}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export function EmptyAttentionState() {
  return (
    <Card className="border-success/30 bg-success/5">
      <CardContent className="p-4 flex items-center gap-3">
        <Inbox className="h-5 w-5 text-success" />
        <div>
          <p className="text-sm font-medium">You're all caught up</p>
          <p className="text-xs text-muted-foreground">Nothing is waiting on you right now.</p>
        </div>
      </CardContent>
    </Card>
  );
}