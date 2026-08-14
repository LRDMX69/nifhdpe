import { useQuery } from "@tanstack/react-query";
import { industrialDb } from "@/lib/industrialDb";

type FinancePeriodReport = {
  invoiced?: number | null;
  collected?: number | null;
  operating_expenses?: number | null;
  worker_payments?: number | null;
  monthly?: Array<{
    month: string;
    invoiced?: number | null;
    collected?: number | null;
    expenses?: number | null;
    worker_payments?: number | null;
  }>;
};

const getDefaultPeriod = () => {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - 11, 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
};

export const useExecutiveFinancials = (orgId: string | null | undefined) => {
  return useQuery({
    queryKey: ["executive-financials", orgId],
    queryFn: async () => {
      if (!orgId) return null;

      const period = getDefaultPeriod();
      const { data, error } = await industrialDb.rpc("get_finance_period_report", {
        _org_id: orgId,
        _from: period.from,
        _to: period.to,
      });
      if (error) throw error;

      const report = (data ?? {}) as FinancePeriodReport;
      const totalRevenue = Number(report.invoiced ?? 0);
      const totalReceived = Number(report.collected ?? 0);
      const totalExpenses = Number(report.operating_expenses ?? 0) + Number(report.worker_payments ?? 0);

      return {
        totalRevenue,
        totalReceived,
        receivables: Math.max(0, totalRevenue - totalReceived),
        totalExpenses,
        netCash: totalReceived - totalExpenses,
        chartData: (report.monthly ?? []).map((row) => ({
          month: row.month,
          revenue: Number(row.invoiced ?? 0),
          expenses: Number(row.expenses ?? 0) + Number(row.worker_payments ?? 0),
        })),
      };
    },
    enabled: !!orgId,
    retry: false,
  });
};
