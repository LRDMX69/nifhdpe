import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus, FileText, Download } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Database } from "@/integrations/supabase/types";

interface PayrollTabProps {
  salaryPayments: any[];
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

  const exportBankCSV = () => {
    if (salaryPayments.length === 0) return;
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthPayments = salaryPayments.filter((p) => p.date?.startsWith(thisMonth));

    const csvRows = [
      ["Account Name", "Account Number", "Bank Name", "Amount", "Narration"]
    ];

    monthPayments.forEach(p => {
      // @ts-ignore
      const bankName = profileMap.get(p.user_id)?.bank_name || "NOT_SET";
      // @ts-ignore
      const acctNum = profileMap.get(p.user_id)?.bank_account_number || "NOT_SET";
      const acctName = getMemberName(p.user_id);
      const amount = Number(p.net_pay || p.amount);
      csvRows.push([acctName, acctNum, bankName, amount.toString(), `Salary ${thisMonth}`]);
    });

    const csvContent = csvRows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `bank_schedule_${thisMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportBankCSV}>
              <Download className="h-4 w-4 mr-1" />Export Bank CSV
            </Button>
            <Button size="sm" onClick={onAddPayment}>
              <Plus className="h-4 w-4 mr-1" />Record Salary
            </Button>
          </div>
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
                      <div className="space-y-3 pl-8">
                        {payments.map((p) => (
                          <div key={p.id} className="border-t pt-2 first:border-0 first:pt-0">
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span>{p.date} — {p.description || "Salary"}</span>
                              <div className="flex items-center gap-2">
                                <span>Net: ₦{Number(p.amount).toLocaleString()}</span>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={async () => {
                                  const { generatePdf } = await import("@/lib/generatePdf");
                                  generatePdf({
                                    title: `Payslip — ${p.date}`,
                                    senderName: "NIF Technical Services Ltd",
                                    contentSections: [
                                      { heading: "Employee Information", bullets: [
                                        `Name: ${getMemberName(p.user_id)}`,
                                        `Month: ${p.date}`,
                                        `Payslip No: ${p.document_number || 'N/A'}`
                                      ]},
                                      { heading: "Earnings", bullets: [
                                        `Basic Salary: ₦${Number(p.basic_salary || 0).toLocaleString()}`,
                                        `Housing: ₦${Number(p.housing_allowance || 0).toLocaleString()}`,
                                        `Transport: ₦${Number(p.transport_allowance || 0).toLocaleString()}`,
                                        `**Gross Pay: ₦${Number(p.gross_pay || p.amount).toLocaleString()}**`
                                      ]},
                                      { heading: "Deductions", bullets: [
                                        `Pension (Employee): ₦${Number(p.pension_employee || 0).toLocaleString()}`,
                                        `NHF: ₦${Number(p.nhf_deduction || 0).toLocaleString()}`,
                                        `PAYE Tax: ₦${Number(p.paye_tax || 0).toLocaleString()}`,
                                        `**Total Deductions: ₦${(Number(p.pension_employee || 0) + Number(p.nhf_deduction || 0) + Number(p.paye_tax || 0)).toLocaleString()}**`
                                      ]},
                                      { heading: "Summary", bullets: [
                                        `**Net Pay: ₦${Number(p.net_pay || p.amount).toLocaleString()}**`
                                      ]}
                                    ],
                                    stampType: "finance",
                                    showSignature: true
                                  });
                                }}>
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {p.gross_pay && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Gross: ₦{Number(p.gross_pay).toLocaleString()} | Tax: ₦{Number(p.paye_tax).toLocaleString()} | Pension: ₦{Number(p.pension_employee).toLocaleString()}
                              </p>
                            )}
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
