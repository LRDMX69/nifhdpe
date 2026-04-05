import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Plus } from "lucide-react";
import { RecordActions } from "../RecordActions";
import type { Database } from "@/integrations/supabase/types";

interface PerformanceTabProps {
  performanceLogs: Database["public"]["Tables"]["performance_logs"]["Row"][];
  getMemberName: (userId: string) => string;
  onAddReview: () => void;
  onEdit: (log: Database["public"]["Tables"]["performance_logs"]["Row"]) => void;
  onDelete: (id: string, table: string, label: string) => void;
}

export const PerformanceTab = ({ 
  performanceLogs, 
  getMemberName, 
  onAddReview, 
  onEdit, 
  onDelete 
}: PerformanceTabProps) => {
  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" /> Performance Logs
        </CardTitle>
        <Button size="sm" onClick={onAddReview}>
          <Plus className="h-4 w-4 mr-1" />Add Review
        </Button>
      </CardHeader>
      <CardContent>
        {performanceLogs.length > 0 ? (
          <div className="space-y-2">
            {performanceLogs.map((p) => (
              <div 
                key={p.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{getMemberName(p.user_id)} — {p.period}</p>
                  {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] ${
                      p.rating >= 4 ? "text-primary" : 
                      p.rating >= 3 ? "text-warning" : "text-destructive"
                    }`}
                  >
                    {p.rating}/5
                  </Badge>
                  <RecordActions 
                    item={p} 
                    table="performance_logs" 
                    label="performance review" 
                    onEdit={() => onEdit(p)} 
                    onDelete={onDelete}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No performance reviews yet.</p>
        )}
      </CardContent>
    </Card>
  );
};
