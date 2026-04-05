import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface IDCardsTabProps {
  uniqueEmployees: { user_id: string; role?: string }[];
  profileMap: Map<string, { full_name: string; avatar_url: string | null }>;
  onGenerateID: (employee: { user_id: string; role?: string }) => void;
}

export const IDCardsTab = ({ uniqueEmployees, profileMap, onGenerateID }: IDCardsTabProps) => {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" /> Employee ID Cards
        </CardTitle>
      </CardHeader>
      <CardContent>
        {uniqueEmployees.length > 0 ? (
          <div className="space-y-2">
            {uniqueEmployees.map((m) => {
              const prof = profileMap.get(m.user_id);
              return (
                <div 
                  key={m.user_id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      {prof?.avatar_url && <AvatarImage src={prof.avatar_url} />}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {(prof?.full_name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{prof?.full_name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {m.role?.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onGenerateID(m)}
                  >
                    <CreditCard className="h-3.5 w-3.5 mr-1" />Generate ID
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No employees found.</p>
        )}
      </CardContent>
    </Card>
  );
};
