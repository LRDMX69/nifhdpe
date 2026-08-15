import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { History, Loader2 } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  created_at: string;
  revision_reason: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  profiles?: { full_name: string | null } | null;
  revision_number?: number;
  is_current?: boolean;
}

/** Keys that carry no history value (auto-set or structural). */
const NOISE_KEYS = new Set(["id", "created_at", "updated_at", "organization_id", "revision_reason"]);

const formatValue = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "number") return v.toLocaleString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const labelOf = (key: string): string =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const revisionEntityType = (tableName: string): string => ({
  invoices: "invoice",
  purchase_orders: "purchase_order",
  deliveries: "delivery",
  projects: "project",
  field_reports: "field_report",
}[tableName] ?? tableName);

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tableName: string;
  recordId: string;
  orgId: string;
  title?: string;
}

/**
 * Revision history for a single record. It prefers the detailed audit_logs trail
 * and falls back to document_revisions snapshots used by operational documents.
 * The fallback keeps Finance, Quotations, Procurement, Logistics, and the central
 * registry on one consistent immutable-history model.
 */
export const AuditHistoryDialog = ({ open, onOpenChange, tableName, recordId, orgId, title }: Props) => {
  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ["audit-history", tableName, recordId],
    enabled: open && !!orgId,
    queryFn: async (): Promise<AuditEntry[]> => {
      const auditResult = await supabase
        .from("audit_logs")
        .select("id, action, created_at, revision_reason, old_data, new_data, profiles(full_name)")
        .eq("table_name", tableName)
        .eq("record_id", recordId)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      const auditEntries = (auditResult.data as unknown as AuditEntry[]) ?? [];
      if (auditEntries.length > 0) return auditEntries;

      const revisionResult = await (supabase as any)
        .from("document_revisions")
        .select("id, revision_number, is_current, snapshot, changed_at, changed_by, change_reason")
        .eq("organization_id", orgId)
        .eq("entity_type", revisionEntityType(tableName))
        .eq("entity_id", recordId)
        .order("revision_number", { ascending: true });
      if (revisionResult.error) throw revisionResult.error;

      const revisions = ((revisionResult.data ?? []) as unknown as Array<{
        id: string;
        revision_number: number;
        is_current: boolean;
        snapshot: Record<string, unknown>;
        changed_at: string;
        changed_by: string | null;
        change_reason: string | null;
      }>);
      return revisions.map((revision, index) => ({
        id: `document-revision-${revision.id}`,
        action: index === 0 ? "INSERT" : "UPDATE",
        created_at: revision.changed_at,
        revision_reason: `${revision.change_reason ?? "Operational revision"} · Snapshot v${revision.revision_number}${revision.is_current ? " · Current" : " · Superseded"}`,
        old_data: index > 0 ? revisions[index - 1].snapshot : null,
        new_data: revision.snapshot,
        revision_number: revision.revision_number,
        is_current: revision.is_current,
        profiles: null,
      }));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            {title ?? "Revision History"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading history…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-4">Could not load history. {String(error)}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No changes recorded for this record yet. Every edit (including the revision reason) will appear here.
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => {
              const changes: { key: string; from: string; to: string }[] = [];
              if (e.action === "UPDATE" && e.old_data && e.new_data) {
                for (const key of Object.keys(e.new_data)) {
                  if (NOISE_KEYS.has(key)) continue;
                  const oldV = e.old_data[key];
                  const newV = e.new_data[key];
                  if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
                    changes.push({ key, from: formatValue(oldV), to: formatValue(newV) });
                  }
                }
              }
              return (
                <div key={e.id} className="rounded-md border border-border/60 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant={e.action === "DELETE" ? "destructive" : e.action === "INSERT" ? "success" : "outline"} className="capitalize">
                        {e.action.toLowerCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {e.profiles?.full_name ?? "System"} · {new Date(e.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {e.revision_reason && (
                    <p className="text-xs rounded bg-amber-500/10 border border-amber-500/30 px-2 py-1">
                      <span className="font-medium">Reason:</span> {e.revision_reason}
                    </p>
                  )}
                  {changes.length > 0 ? (
                    <div className="space-y-1">
                      {changes.map((c) => (
                        <div key={c.key} className="text-xs grid grid-cols-[110px_1fr_1fr] gap-2 items-start">
                          <span className="text-muted-foreground font-medium">{labelOf(c.key)}</span>
                          <span className="text-destructive line-through break-words">{c.from}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 break-words">{c.to}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Record created (original values preserved above).</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
