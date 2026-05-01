import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Plus } from "lucide-react";
import { RecordActions } from "../RecordActions";
import type { Database } from "@/integrations/supabase/types";

interface DisciplinaryTabProps {
  disciplinary: Database["public"]["Tables"]["disciplinary_records"]["Row"][];
  getMemberName: (userId: string) => string;
  onRecord: () => void;
  onEdit: (record: Database["public"]["Tables"]["disciplinary_records"]["Row"]) => void;
  onDelete: (id: string, table: string, label: string) => void;
}

export const DisciplinaryTab = ({ 
  disciplinary, 
  getMemberName, 
  onRecord, 
  onEdit, 
  onDelete 
}: DisciplinaryTabProps) => {
  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-destructive" /> Disciplinary Records
        </CardTitle>
        <Button size="sm" variant="destructive" onClick={onRecord}>
          <Plus className="h-4 w-4 mr-1" />Record
        </Button>
      </CardHeader>
      <CardContent>
        {disciplinary.length > 0 ? (
          <div className="space-y-2">
            {disciplinary.map((d) => (
              <div 
                key={d.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{getMemberName(d.user_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.description.slice(0, 80)}{d.description.length > 80 ? "..." : ""}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {d.incident_date}{d.action_taken ? ` · ${d.action_taken}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] capitalize ${
                      d.severity === "termination" || d.severity === "suspension" ? "text-destructive" : "text-warning"
                    }`}
                  >
                    {d.severity.replace("_", " ")}
                  </Badge>
                  <RecordActions 
                    item={d} 
                    onEdit={() => onEdit(d)} 
                    onDelete={() => onDelete(d.id, "disciplinary_records", "record")}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No disciplinary records.</p>
        )}
      </CardContent>
    </Card>
  );
};
