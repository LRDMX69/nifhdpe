import { FileText, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/constants";

interface Quotation {
  id: string;
  quotation_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  clients?: {
    name: string;
  };
}

interface QuotationCardProps {
  quotation: Quotation;
  canEdit: boolean;
  canDelete: boolean;
  statusVariant: Record<string, "default" | "outline" | "secondary" | "destructive">;
  onEdit: () => void;
  onPrint: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
  allStatuses: string[];
}

export const QuotationCard = ({
  quotation,
  canEdit,
  canDelete,
  statusVariant,
  onEdit,
  onPrint,
  onDelete,
  onStatusChange,
  allStatuses
}: QuotationCardProps) => (
  <Card className="gsap-card border-border/50 hover:border-primary/20 transition-all">
    <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm">{quotation.quotation_number}</p>
          <p className="text-xs text-muted-foreground truncate">
            {quotation.clients?.name ?? "No client"} · {new Date(quotation.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:shrink-0">
        <span className="font-bold text-sm">{formatCurrency(quotation.total_amount ?? 0)}</span>
        <Badge variant={statusVariant[quotation.status] ?? "outline"} className="capitalize">
          {quotation.status}
        </Badge>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPrint}>
                <FileText className="h-3.5 w-3.5 mr-2" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {allStatuses.filter(s => s !== quotation.status).map(s => (
                <DropdownMenuItem key={s} onClick={() => onStatusChange(s)} className="capitalize">
                  {s}
                </DropdownMenuItem>
              ))}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </CardContent>
  </Card>
);
