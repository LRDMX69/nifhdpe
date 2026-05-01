import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Plus } from "lucide-react";
import { RecordActions } from "../RecordActions";
import type { Database } from "@/integrations/supabase/types";

interface SkillsTabProps {
  skills: Database["public"]["Tables"]["employee_skills"]["Row"][];
  getMemberName: (userId: string) => string;
  onAddSkill: () => void;
  onEdit: (skill: Database["public"]["Tables"]["employee_skills"]["Row"]) => void;
  onDelete: (id: string, table: string, label: string) => void;
}

export const SkillsTab = ({ 
  skills, 
  getMemberName, 
  onAddSkill, 
  onEdit, 
  onDelete 
}: SkillsTabProps) => {
  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" /> Employee Skills Matrix
        </CardTitle>
        <Button size="sm" onClick={onAddSkill}>
          <Plus className="h-4 w-4 mr-1" />Add Skill
        </Button>
      </CardHeader>
      <CardContent>
        {skills.length > 0 ? (
          <div className="space-y-2">
            {skills.map((s) => (
              <div 
                key={s.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{s.skill_name}</p>
                  <p className="text-xs text-muted-foreground">{getMemberName(s.user_id)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div 
                        key={i} 
                        className={`h-2 w-2 rounded-full ${i < s.proficiency_level ? "bg-primary" : "bg-muted"}`} 
                      />
                    ))}
                  </div>
                  {s.certified && (
                    <Badge variant="outline" className="text-[10px] text-primary">Certified</Badge>
                  )}
                  <RecordActions 
                    item={s} 
                    onEdit={() => onEdit(s)} 
                    onDelete={() => onDelete(s.id, "employee_skills", "skill")}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No skills recorded.</p>
        )}
      </CardContent>
    </Card>
  );
};
