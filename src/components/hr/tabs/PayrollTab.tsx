import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Database } from "@/integrations/supabase/types";

interface PayrollTabProps {
  salaryPayments: Database["public"]["Tables"]["worker_payments"]["Row"][];
  profileMap: Map<string, { full_name: string; avatar_url: string | null }>;
  getMemberName: (userId: string) => string;
  memberOptions: { value: string; label: string }[];
  onAddPayment: () => void;
}

export const PayrollTab = ({ 
  salaryPayments, 
  profileMap, 
  getMemberName, 
  onAddPayment 
}: PayrollTabProps) => {
  const payrollSummary = (() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthPayments = salaryPayments.filter((p) => p.date?.startsWith(thisMonth));
    const totalThisMonth = monthPayments.reduce((s, p) => s + Number(p.amount), 0);
    return { totalThisMonth, count: monthPayments.length, total: salaryPayments.length };
  })();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">This Month Total</p>
            <p className="text-lg font-bold">₦{payrollSummary.totalThisMonth.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">Payments This Month</p>
            <p className="text-lg font-bold">{payrollSummary.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">All-Time Records</p>
            <p className="text-lg font-bold">{payrollSummary.total}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" /> Salary Payments
          </CardTitle>
          <Button size="sm" onClick={onAddPayment}>
            <Plus className="h-4 w-4 mr-1" />Record Salary
          </Button>
        </CardHeader>
        <CardContent>
          {salaryPayments.length > 0 ? (() => {
            const groupedByEmployee = new Map<string, Database["public"]["Tables"]["worker_payments"]["Row"][]>();
            salaryPayments.forEach((p) => {
              if (!groupedByEmployee.has(p.user_id)) {
                groupedByEmployee.set(p.user_id, []);
              }
              groupedByEmployee.get(p.user_id)!.push(p);
            });
            
            return (
              <div className="space-y-3">
                {[...groupedByEmployee.entries()].map(([userId, payments]) => {
                  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
                  return (
                    <div key={userId} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            {profileMap.get(userId)?.avatar_url && (
                              <AvatarImage src={profileMap.get(userId)?.avatar_url || ""} />
                            )}
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {(profileMap.get(userId)?.full_name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-sm font-medium">{getMemberName(userId)}</p>
                        </div>
                        <Badge variant="outline" className="text-xs font-semibold text-primary">
                          ₦{totalAmount.toLocaleString()}
                        </Badge>
                      </div>
                      <div className="space-y-1 pl-8">
                        {payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{p.date}{p.description ? ` · ${p.description}` : ""}</span>
                            <span>₦{Number(p.amount).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })() : (
            <p className="text-sm text-muted-foreground">No salary records yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
