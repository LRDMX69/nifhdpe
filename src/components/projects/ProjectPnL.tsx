import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/constants";
import { TrendingUp, TrendingDown, DollarSign, Users, Package, CreditCard, Loader2 } from "lucide-react";

interface ProjectPnLProps {
  projectId: string;
  projectBudget: number;
}

export const ProjectPnL = ({ projectId, projectBudget }: ProjectPnLProps) => {
  const { data: pnl, isLoading } = useQuery({
    queryKey: ["project-pnl", projectId],
    queryFn: async () => {
      // 1. Revenue (Invoices)
      const { data: invoices } = await (supabase.from("invoices") as any).select("total_amount").eq("project_id", projectId);
      const totalRevenue = invoices?.reduce((s, i) => s + Number(i.total_amount || 0), 0) || 0;

      // 2. Direct Expenses
      const { data: expenses } = await supabase.from("expenses").select("*").eq("project_id", projectId);
      const totalDirectExpenses = expenses?.reduce((s, e) => s + Number(e.amount || 0), 0) || 0;

      // 3. Materials (from Material Requisitions)
      // We join MR items with inventory to get the cost
      const { data: mrs } = await supabase.from("material_requisitions").select("id").eq("project_id", projectId);
      const mrIds = mrs?.map(m => m.id) || [];
      let totalMaterialCost = 0;
      if (mrIds.length > 0) {
        const { data: mrItems } = await (supabase.from("mr_items") as any)
          .select("quantity_issued, inventory(unit_cost)")
          .in("mr_id", mrIds);
        
        totalMaterialCost = mrItems?.reduce((s, item) => {
          const unitCost = (item.inventory as any)?.unit_cost || 0;
          return s + (Number(item.quantity_issued || 0) * Number(unitCost));
        }, 0) || 0;
      }

      // 4. Labor Cost (Roll-up from attendance)
      // This is an estimate: Days worked * Average daily rate (e.g., 5000 NGN)
      // In a real system, we'd use the user's specific salary rate.
      const { data: project } = await supabase.from("projects").select("team_member_ids").eq("id", projectId).single();
      const teamIds = (project?.team_member_ids as unknown as string[]) || [];
      
      let totalLaborCost = 0;
      if (teamIds.length > 0) {
        const { data: attendance } = await supabase
          .from("attendance")
          .select("id")
          .in("user_id", teamIds)
          .eq("status", "present"); // Assuming attendance is filtered for this project somehow, or we just count all attendance for team during project period
        
        const avgDailyRate = 5000; // Placeholder for Nigerian tech daily rate
        totalLaborCost = (attendance?.length || 0) * avgDailyRate;
      }

      const totalCosts = totalDirectExpenses + totalMaterialCost + totalLaborCost;
      const profit = totalRevenue - totalCosts;
      const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      return {
        totalRevenue,
        totalDirectExpenses,
        totalMaterialCost,
        totalLaborCost,
        totalCosts,
        profit,
        margin,
        expenses: expenses || []
      };
    }
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Project Revenue</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(pnl?.totalRevenue || 0)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Budget: {formatCurrency(projectBudget)}</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Costs</p>
            <p className="text-xl font-bold text-destructive">{formatCurrency(pnl?.totalCosts || 0)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Burn rate: {projectBudget > 0 ? ((pnl?.totalCosts || 0) / projectBudget * 100).toFixed(1) : 0}% of budget</p>
          </CardContent>
        </Card>
        <Card className={pnl?.profit && pnl.profit >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}>
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Estimated Profit</p>
            <p className={`text-xl font-bold ${pnl?.profit && pnl.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(pnl?.profit || 0)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Margin: {pnl?.margin.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Cost Breakdown</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[10px]"><span className="flex items-center gap-1"><Users className="h-2 w-2" /> Labor</span><span>{formatCurrency(pnl?.totalLaborCost || 0)}</span></div>
              <div className="flex justify-between text-[10px]"><span className="flex items-center gap-1"><Package className="h-2 w-2" /> Materials</span><span>{formatCurrency(pnl?.totalMaterialCost || 0)}</span></div>
              <div className="flex justify-between text-[10px]"><span className="flex items-center gap-1"><CreditCard className="h-2 w-2" /> Direct</span><span>{formatCurrency(pnl?.totalDirectExpenses || 0)}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Direct Expenses Breakdown</CardTitle></CardHeader>
        <CardContent>
          {pnl?.expenses && pnl.expenses.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead className="text-xs">Date</TableHead><TableHead className="text-xs">Category</TableHead><TableHead className="text-xs">Description</TableHead><TableHead className="text-right text-xs">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {pnl.expenses.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">{e.date}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{e.category}</Badge></TableCell>
                    <TableCell className="text-xs truncate max-w-[150px]">{e.description}</TableCell>
                    <TableCell className="text-right text-xs font-bold">{formatCurrency(e.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="text-xs text-muted-foreground text-center py-4">No direct expenses recorded for this project.</p>}
        </CardContent>
      </Card>
    </div>
  );
};
