import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Plus } from "lucide-react";
import { RecordActions } from "../RecordActions";
import type { Database } from "@/integrations/supabase/types";

interface RecruitmentTabProps {
  recruitment: Database["public"]["Tables"]["recruitment"]["Row"][];
  onAdd: () => void;
  onEdit: (item: Database["public"]["Tables"]["recruitment"]["Row"]) => void;
  onDelete: (id: string, table: string, label: string) => void;
}

export const RecruitmentTab = ({ recruitment, onAdd, onEdit, onDelete }: RecruitmentTabProps) => {
  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" /> Recruitment
        </CardTitle>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />Add
        </Button>
      </CardHeader>
      <CardContent>
        {recruitment.length > 0 ? (
          <div className="space-y-2">
            {recruitment.map((r) => (
              <div 
                key={r.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{r.position_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.candidate_name ?? "No candidate"} · {r.department ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] capitalize ${
                      r.status === "hired" ? "text-primary" : 
                      r.status === "rejected" ? "text-destructive" : "text-warning"
                    }`}
                  >
                    {r.status}
                  </Badge>
                  <RecordActions 
                    item={r} 
                    onEdit={() => onEdit(r)} 
                    onDelete={() => onDelete(r.id, "recruitment", "recruitment entry")}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No recruitment entries.</p>
        )}
      </CardContent>
    </Card>
  );
};
