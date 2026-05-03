import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: string;
  onClick?: () => void;
  description?: string;
}

export const StatCard = ({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  color = "text-primary", 
  onClick,
  description
}: StatCardProps) => {
  return (
    <Card 
      className={`gsap-card border-border/50 shadow-sm hover:border-primary/30 transition-all ${onClick ? "cursor-pointer" : ""}`} 
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="p-2 rounded-lg bg-muted/50">
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          {trend && (
            <Badge variant="outline" className="text-[10px] font-normal italic">
              {trend}
            </Badge>
          )}
        </div>
        <div className="mt-3">
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {label}
          </p>
          <p className="text-lg sm:text-xl font-bold mt-1 truncate text-foreground">
            {value}
          </p>
          {description && (
            <p className="text-[10px] text-muted-foreground mt-1 truncate">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
