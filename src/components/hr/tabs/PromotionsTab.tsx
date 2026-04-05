import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Plus } from "lucide-react";
import { RecordActions } from "../RecordActions";
import type { Database } from "@/integrations/supabase/types";

interface PromotionsTabProps {
  promotions: Database["public"]["Tables"]["promotions"]["Row"][];
  getMemberName: (userId: string) => string;
  onAddPromotion: () => void;
  onEdit: (promo: Database["public"]["Tables"]["promotions"]["Row"]) => void;
  onDelete: (id: string, table: string, label: string) => void;
}

export const PromotionsTab = ({ 
  promotions, 
  getMemberName, 
  onAddPromotion, 
  onEdit, 
  onDelete 
}: PromotionsTabProps) => {
  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" /> Promotion History
        </CardTitle>
        <Button size="sm" onClick={onAddPromotion}>
          <Plus className="h-4 w-4 mr-1" />Add Promotion
        </Button>
      </CardHeader>
      <CardContent>
        {promotions.length > 0 ? (
          <div className="space-y-2">
            {promotions.map((p) => (
              <div 
                key={p.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{getMemberName(p.user_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.previous_role ?? "—"} → {p.new_role} · {p.effective_date}
                  </p>
                  {p.reason && <p className="text-[10px] text-muted-foreground">{p.reason}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px] text-primary">Promoted</Badge>
                  <RecordActions 
                    item={p} 
                    table="promotions" 
                    label="promotion" 
                    onEdit={() => onEdit(p)} 
                    onDelete={onDelete}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No promotion records.</p>
        )}
      </CardContent>
    </Card>
  );
};
