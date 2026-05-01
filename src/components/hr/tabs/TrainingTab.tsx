import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Plus } from "lucide-react";
import { RecordActions } from "../RecordActions";
import type { Database } from "@/integrations/supabase/types";

interface TrainingTabProps {
  trainingLogs: Database["public"]["Tables"]["training_logs"]["Row"][];
  getMemberName: (userId: string) => string;
  onLogTraining: () => void;
  onEdit: (log: Database["public"]["Tables"]["training_logs"]["Row"]) => void;
  onDelete: (id: string, table: string, label: string) => void;
}

export const TrainingTab = ({ 
  trainingLogs, 
  getMemberName, 
  onLogTraining, 
  onEdit, 
  onDelete 
}: TrainingTabProps) => {
  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" /> Training Logs
        </CardTitle>
        <Button size="sm" onClick={onLogTraining}>
          <Plus className="h-4 w-4 mr-1" />Log Training
        </Button>
      </CardHeader>
      <CardContent>
        {trainingLogs.length > 0 ? (
          <div className="space-y-2">
            {trainingLogs.map((t) => (
              <div 
                key={t.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.training_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {getMemberName(t.user_id)} · {t.training_type ?? "—"}
                    {t.completed_date ? ` · Done: ${t.completed_date}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {t.score != null && (
                    <Badge variant="outline" className="text-[10px]">{t.score}%</Badge>
                  )}
                  <RecordActions 
                    item={t} 
                    onEdit={() => onEdit(t)} 
                    onDelete={() => onDelete(t.id, "training_logs", "training log")}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No training logs.</p>
        )}
      </CardContent>
    </Card>
  );
};
