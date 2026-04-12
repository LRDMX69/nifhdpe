import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/constants";

interface QuotationSummaryProps {
  subtotal: number;
  laborTotal: number;
  transportCost: number;
  profitMargin: number;
  profitAmount: number;
  grandTotal: number;
}

export const QuotationSummary = ({
  subtotal,
  laborTotal,
  transportCost,
  profitMargin,
  profitAmount,
  grandTotal
}: QuotationSummaryProps) => (
  <Card className="bg-muted/50 border-border/50">
    <CardContent className="pt-4 pb-4 space-y-1 text-sm">
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span>Labor</span>
        <span>{formatCurrency(laborTotal)}</span>
      </div>
      <div className="flex justify-between">
        <span>Transport</span>
        <span>{formatCurrency(transportCost)}</span>
      </div>
      <div className="flex justify-between">
        <span>Profit ({profitMargin}%)</span>
        <span>{formatCurrency(profitAmount)}</span>
      </div>
      <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-2">
        <span>Grand Total</span>
        <span className="text-primary">{formatCurrency(grandTotal)}</span>
      </div>
    </CardContent>
  </Card>
);
