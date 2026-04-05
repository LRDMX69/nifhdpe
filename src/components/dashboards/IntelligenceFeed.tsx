import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, AlertTriangle, Info, CheckCircle2, RefreshCw, Loader2, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const severityConfig: Record<string, { icon: typeof AlertTriangle; color: string }> = {
  critical: { icon: AlertTriangle, color: "text-red-500 bg-red-500/10 border-red-500/20" },
  warning: { icon: AlertTriangle, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  info: { icon: Info, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
};

export const IntelligenceFeed = () => {
  const { memberships, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = memberships[0]?.organization_id;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["intelligence-logs", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("ai_intelligence_logs")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const runMonitor = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No org");
      const { error } = await supabase.functions.invoke("central-ai-monitor", {
        body: { organization_id: orgId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Central AI scan complete" });
      queryClient.invalidateQueries({ queryKey: ["intelligence-logs"] });
      queryClient.invalidateQueries({ queryKey: ["ai-summary"] });
    },
    onError: (err: any) => toast({ title: "Scan failed", description: err.message, variant: "destructive" }),
  });

  const markReviewed = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("ai_intelligence_logs").update({ is_reviewed: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["intelligence-logs"] }),
  });

  const unreviewed = logs.filter((l: any) => !l.is_reviewed);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Central AI Intelligence
            {unreviewed.length > 0 && (
              <Badge variant="destructive" className="text-[10px]">{unreviewed.length} new</Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => runMonitor.mutate()} disabled={runMonitor.isPending}>
            {runMonitor.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            Run Scan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No intelligence flags yet. Run a scan to detect anomalies.</p>
        ) : (
          logs.map((log: any) => {
            const config = severityConfig[log.severity] ?? severityConfig.info;
            const Icon = config.icon;
            return (
              <div key={log.id} className={`rounded-lg p-3 text-xs space-y-1 border ${config.color} ${!log.is_reviewed ? "ring-1 ring-primary/30" : "opacity-70"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium truncate">{log.title}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="text-[10px] capitalize">{log.category}</Badge>
                    {!log.is_reviewed && (
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => markReviewed.mutate(log.id)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                {log.details && <p className="text-muted-foreground break-words">{log.details}</p>}
                <p className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
