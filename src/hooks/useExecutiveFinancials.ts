import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useExecutiveFinancials = (orgId: string | null | undefined) => {
  return useQuery({
    queryKey: ["executive-financials", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      
      const [invoices, receipts, expenses, payments] = await Promise.all([
        supabase.from("invoices").select("total_amount, balance_due, status, invoice_date").eq("organization_id", orgId),
        supabase.from("receipts").select("amount_received, payment_date").eq("organization_id", orgId),
        supabase.from("expenses").select("amount, date").eq("organization_id", orgId),
        supabase.from("worker_payments").select("amount, date").eq("organization_id", orgId)
      ]);

      const totalRevenue = invoices.data?.reduce((s, i) => s + Number(i.total_amount || 0), 0) || 0;
      const totalReceived = receipts.data?.reduce((s, r) => s + Number(r.amount_received || 0), 0) || 0;
      const receivables = invoices.data?.reduce((s, i) => s + Number(i.balance_due || 0), 0) || 0;
      const totalExpenses = (expenses.data?.reduce((s, e) => s + Number(e.amount || 0), 0) || 0) + 
                           (payments.data?.reduce((s, p) => s + Number(p.amount || 0), 0) || 0);
      
      const netCash = totalReceived - totalExpenses;

      // Group by month for chart
      const monthlyMap = new Map();
      invoices.data?.forEach(i => {
        const month = new Date(i.invoice_date).toLocaleString('default', { month: 'short' });
        const entry = monthlyMap.get(month) || { month, revenue: 0, expenses: 0 };
        entry.revenue += Number(i.total_amount || 0);
        monthlyMap.set(month, entry);
      });
      expenses.data?.forEach(e => {
        const month = new Date(e.date).toLocaleString('default', { month: 'short' });
        const entry = monthlyMap.get(month) || { month, revenue: 0, expenses: 0 };
        entry.expenses += Number(e.amount || 0);
        monthlyMap.set(month, entry);
      });

      return {
        totalRevenue,
        totalReceived,
        receivables,
        totalExpenses,
        netCash,
        chartData: Array.from(monthlyMap.values()).slice(-6)
      };
    },
    enabled: !!orgId
  });
};
