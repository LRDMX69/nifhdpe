import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

interface InventoryItem {
  id: string;
  item_name: string;
  quantity_meters: number | null;
  location_id: string | null;
  box_id: string | null;
  storage_locations: { name: string } | null;
  storage_boxes: { box_code: string; label: string | null } | null;
}

export const InventoryFinder = () => {
  const { memberships } = useAuth();
  const orgId = memberships[0]?.organization_id;
  const [search, setSearch] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["inventory-finder", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("inventory")
        .select("id, item_name, quantity_meters, location_id, box_id, storage_locations(name), storage_boxes(box_code, label)")
        .eq("organization_id", orgId)
        .order("item_name");
      return (data ?? []) as InventoryItem[];
    },
    enabled: !!orgId,
  });

  const filtered = search.trim()
    ? items.filter((i: InventoryItem) => i.item_name.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4" /> Find Item
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Type item name to find..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search.trim() && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">No items found</p>
        )}
        {filtered.slice(0, 10).map((item: InventoryItem) => (
          <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
            <Package className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{item.item_name}</p>
              <p className="text-xs text-muted-foreground">Qty: {item.quantity_meters ?? 0}</p>
              {item.storage_locations ? (
                <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {(item.storage_locations as { name: string }).name}
                  {item.storage_boxes && ` → ${(item.storage_boxes as { box_code: string; label: string | null }).box_code} ${(item.storage_boxes as { box_code: string; label: string | null }).label ? `(${(item.storage_boxes as { box_code: string; label: string | null }).label})` : ""}`}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">No location assigned</p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
