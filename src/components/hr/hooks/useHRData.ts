import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

export const useHRData = (orgId: string | undefined, isHrOrAdmin: boolean) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allAttendance = [] } = useQuery({
    queryKey: ["attendance-all", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("attendance").select("*").eq("organization_id", orgId).eq("date", today).order("check_in", { ascending: false });
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: weeklyAttendance = [] } = useQuery({
    queryKey: ["attendance-weekly", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const { data } = await supabase.from("attendance").select("*").eq("organization_id", orgId).gte("date", weekAgo).order("date", { ascending: false });
      return data ?? [];
    },
    enabled: !!orgId && isHrOrAdmin,
  });

  const { data: profileMap = new Map() } = useQuery({
    queryKey: ["profiles-for-hr", orgId],
    queryFn: async () => {
      if (!orgId) return new Map();
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").eq("organization_id", orgId);
      return new Map((profiles ?? []).map((p) => [p.user_id, p]));
    },
    enabled: !!orgId,
  });

  const { data: membersList = [] } = useQuery({
    queryKey: ["members-list-hr", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("organization_memberships").select("user_id, role").eq("organization_id", orgId);
      return data ?? [];
    },
    enabled: !!orgId && isHrOrAdmin,
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["leave-requests", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("leave_requests").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(30);
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const { data: performanceLogs = [] } = useQuery({
    queryKey: ["performance-logs", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("performance_logs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
    enabled: !!orgId && isHrOrAdmin,
  });

  const { data: recruitment = [] } = useQuery({
    queryKey: ["recruitment", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("recruitment").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(30);
      return data ?? [];
    },
    enabled: !!orgId && isHrOrAdmin,
  });

  const { data: trainingLogs = [] } = useQuery({
    queryKey: ["training-logs", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("training_logs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(30);
      return data ?? [];
    },
    enabled: !!orgId && isHrOrAdmin,
  });

  const { data: skills = [] } = useQuery({
    queryKey: ["employee-skills", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("employee_skills").select("*").eq("organization_id", orgId).order("skill_name");
      return data ?? [];
    },
    enabled: !!orgId && isHrOrAdmin,
  });

  const { data: disciplinary = [] } = useQuery({
    queryKey: ["disciplinary", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("disciplinary_records").select("*").eq("organization_id", orgId).order("incident_date", { ascending: false }).limit(20);
      return data ?? [];
    },
    enabled: !!orgId && isHrOrAdmin,
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ["promotions", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("promotions").select("*").eq("organization_id", orgId).order("effective_date", { ascending: false }).limit(20);
      return data ?? [];
    },
    enabled: !!orgId && isHrOrAdmin,
  });

  const { data: salaryPayments = [] } = useQuery({
    queryKey: ["salary-payments", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("worker_payments").select("*").eq("organization_id", orgId).eq("type", "salary").order("date", { ascending: false }).limit(100);
      return data ?? [];
    },
    enabled: !!orgId && isHrOrAdmin,
  });

  const { data: orgInfo } = useQuery({
    queryKey: ["org-info-hr", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase.from("organizations").select("name, logo_url").eq("id", orgId).single();
      return data;
    },
    enabled: !!orgId && isHrOrAdmin,
  });

  const getMemberName = (userId: string) => profileMap.get(userId)?.full_name ?? "Unknown";

  return {
    allAttendance,
    weeklyAttendance,
    profileMap,
    membersList,
    leaveRequests,
    performanceLogs,
    recruitment,
    trainingLogs,
    skills,
    disciplinary,
    promotions,
    salaryPayments,
    orgInfo,
    getMemberName,
    memberOptions: membersList.map(m => ({ value: m.user_id, label: getMemberName(m.user_id) })),
  };
};

export type HRData = ReturnType<typeof useHRData>;
