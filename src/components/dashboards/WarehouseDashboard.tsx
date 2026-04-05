import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Package, AlertTriangle, TrendingDown, Truck } from "lucide-react";
import { useGsapFadeUp, useGsapStagger } from "@/hooks/useGsapAnimation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const WarehouseDashboard = () => {
  const { profile, memberships } = useAuth();
  const headerRef = useGsapFadeUp();
  const cardsRef = useGsapStagger(".gsap-card", 0.08);
  const orgId = memberships[0]?.organization_id;

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["warehouse-inventory", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("inventory")
        .select("*")
        .eq("organization_id", orgId)
        .order("item_name");
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: aiInsights } = useQuery({
    queryKey: ["ai-summary", "warehouse", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase
        .from("ai_summaries")
        .select("*")
        .eq("organization_id", orgId)
        .eq("context", "warehouse")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!orgId,
  });

  const lowStockItems = inventory?.filter(
    (item) => item.quantity_meters !== null && item.min_stock_level !== null && item.quantity_meters < item.min_stock_level
  ) ?? [];

  const totalItems = inventory?.length ?? 0;

  return (
    <div className="space-y-6">
      <div ref={headerRef}>
        <h1 className="text-xl sm:text-2xl font-bold">Warehouse Overview</h1>
        <p className="text-muted-foreground text-sm">
          Welcome, {profile?.full_name?.split(" ")[0] ?? "Warehouse"} — live stock intelligence.
        </p>
      </div>

      <div ref={cardsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="gsap-card border-border/50">
          <CardContent className="pt-4 pb-4">
            <Package className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{totalItems}</p>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </CardContent>
        </Card>
        <Card className="gsap-card border-border/50">
          <CardContent className="pt-4 pb-4">
            <AlertTriangle className="h-5 w-5 text-destructive mb-2" />
            <p className="text-2xl font-bold">{lowStockItems.length}</p>
            <p className="text-xs text-muted-foreground">Low Stock</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock Alerts */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
            ) : lowStockItems.length > 0 ? (
              <div className="space-y-3">
                {lowStockItems.slice(0, 8).map((item) => (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{item.item_name}</p>
                      <span className="text-xs text-destructive">{item.quantity_meters} / {item.min_stock_level}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-destructive transition-all"
                        style={{ width: `${Math.min(((item.quantity_meters ?? 0) / (item.min_stock_level ?? 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">All stock levels are healthy.</p>
            )}
          </CardContent>
        </Card>

        {/* AI Predictions */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              AI Stock Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiInsights ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiInsights.summary}</p>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                AI automatically predicts depletion dates, suggests reorder timing, and detects abnormal usage patterns.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WarehouseDashboard;
