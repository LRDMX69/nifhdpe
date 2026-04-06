import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

interface UseHRMutationsProps {
  orgId: string | undefined;
  userId: string | undefined;
}

export const useHRMutations = ({ orgId, userId }: UseHRMutationsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitLeave = useMutation({
    mutationFn: async (values: { leaveType: string; startDate: string; endDate: string; leaveReason: string }) => {
      if (!orgId || !userId) throw new Error("Not authenticated");
      if (!values.startDate || !values.endDate) throw new Error("Select dates");
      const { error } = await supabase.from("leave_requests").insert({
        organization_id: orgId,
        user_id: userId,
        leave_type: values.leaveType,
        start_date: values.startDate,
        end_date: values.endDate,
        reason: values.leaveReason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Leave request submitted" });
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateLeave = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leave_requests").update({ status, approved_by: userId }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast({ title: `Leave ${status}` });
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
  });

  const submitRecruitment = useMutation({
    mutationFn: async (values: {
      editingRecruit: Database["public"]["Tables"]["recruitment"]["Row"] | null;
      recruitTitle: string;
      recruitDept: string;
      candidateName: string;
      candidateEmail: string;
      candidatePhone: string;
    }) => {
      if (!orgId || !userId) throw new Error("Not authenticated");
      const payload: Database["public"]["Tables"]["recruitment"]["Insert"] = {
        organization_id: orgId,
        created_by: userId,
        position_title: values.recruitTitle,
        department: values.recruitDept || null,
        candidate_name: values.candidateName || null,
        candidate_email: values.candidateEmail || null,
        candidate_phone: values.candidatePhone || null,
      };
      if (values.editingRecruit) {
        const { error } = await supabase.from("recruitment").update(payload).eq("id", values.editingRecruit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("recruitment").insert({ ...payload, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: (_, values) => {
      toast({ title: values.editingRecruit ? "Updated" : "Added" });
      queryClient.invalidateQueries({ queryKey: ["recruitment"] });
    },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const submitTraining = useMutation({
    mutationFn: async (values: {
      editingTraining: Database["public"]["Tables"]["training_logs"]["Row"] | null;
      trainingTitle: string;
      trainingType: string;
      trainingUserId: string;
      trainingScore: string;
      trainingNotes: string;
    }) => {
      if (!orgId || !userId || !values.trainingUserId) throw new Error("Select a member");
      const payload: Database["public"]["Tables"]["training_logs"]["Insert"] = {
        organization_id: orgId,
        created_by: userId,
        user_id: values.trainingUserId,
        training_title: values.trainingTitle,
        training_type: values.trainingType || null,
        score: values.trainingScore ? parseInt(values.trainingScore) : null,
        notes: values.trainingNotes || null,
      };
      if (values.editingTraining) {
        const { error } = await supabase.from("training_logs").update(payload).eq("id", values.editingTraining.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("training_logs").insert({ ...payload, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: (_, values) => {
      toast({ title: values.editingTraining ? "Updated" : "Added" });
      queryClient.invalidateQueries({ queryKey: ["training-logs"] });
    },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const submitSkill = useMutation({
    mutationFn: async (values: {
      editingSkill: Database["public"]["Tables"]["employee_skills"]["Row"] | null;
      skillName: string;
      skillUserId: string;
      skillLevel: number;
      skillCertified: boolean;
    }) => {
      if (!orgId || !values.skillUserId || !values.skillName) throw new Error("Fill required fields");
      const payload: Database["public"]["Tables"]["employee_skills"]["Insert"] = {
        organization_id: orgId,
        user_id: values.skillUserId,
        skill_name: values.skillName,
        proficiency_level: values.skillLevel,
        certified: values.skillCertified,
      };
      if (values.editingSkill) {
        const { error } = await supabase.from("employee_skills").update(payload).eq("id", values.editingSkill.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employee_skills").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, values) => {
      toast({ title: values.editingSkill ? "Updated" : "Added" });
      queryClient.invalidateQueries({ queryKey: ["employee-skills"] });
    },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const submitDisciplinary = useMutation({
    mutationFn: async (values: {
      editingDisc: Database["public"]["Tables"]["disciplinary_records"]["Row"] | null;
      discUserId: string;
      discSeverity: string;
      discDescription: string;
      discAction: string;
    }) => {
      if (!orgId || !userId || !values.discUserId || !values.discDescription) throw new Error("Fill required fields");
      const payload: Database["public"]["Tables"]["disciplinary_records"]["Insert"] = {
        organization_id: orgId,
        user_id: values.discUserId,
        issued_by: userId,
        severity: values.discSeverity,
        description: values.discDescription,
        action_taken: values.discAction || null,
      };
      if (values.editingDisc) {
        const { error } = await supabase.from("disciplinary_records").update(payload).eq("id", values.editingDisc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("disciplinary_records").insert({ ...payload, issued_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: (_, values) => {
      toast({ title: values.editingDisc ? "Updated" : "Added" });
      queryClient.invalidateQueries({ queryKey: ["disciplinary"] });
    },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const submitPromotion = useMutation({
    mutationFn: async (values: {
      editingPromo: Database["public"]["Tables"]["promotions"]["Row"] | null;
      promoUserId: string;
      promoPrevRole: string;
      promoNewRole: string;
      promoDate: string;
      promoReason: string;
    }) => {
      if (!orgId || !userId || !values.promoUserId || !values.promoNewRole) throw new Error("Fill required fields");
      const payload: Database["public"]["Tables"]["promotions"]["Insert"] = {
        organization_id: orgId,
        user_id: values.promoUserId,
        previous_role: values.promoPrevRole || null,
        new_role: values.promoNewRole,
        effective_date: values.promoDate || new Date().toISOString().split("T")[0],
        reason: values.promoReason || null,
      };
      if (values.editingPromo) {
        const { error } = await supabase.from("promotions").update(payload).eq("id", values.editingPromo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("promotions").insert({ ...payload, approved_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: (_, values) => {
      toast({ title: values.editingPromo ? "Updated" : "Promotion recorded" });
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const submitPerformance = useMutation({
    mutationFn: async (values: {
      editingPerf: Database["public"]["Tables"]["performance_logs"]["Row"] | null;
      perfUserId: string;
      perfPeriod: string;
      perfRating: number;
      perfNotes: string;
    }) => {
      if (!orgId || !userId || !values.perfUserId || !values.perfPeriod) throw new Error("Fill required fields");
      const payload = {
        organization_id: orgId,
        user_id: values.perfUserId,
        period: values.perfPeriod,
        rating: values.perfRating,
        notes: values.perfNotes || null,
      };
      if (values.editingPerf) {
        const { error } = await supabase.from("performance_logs").update(payload).eq("id", values.editingPerf.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("performance_logs").insert({ ...payload, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: (_, values) => {
      toast({ title: values.editingPerf ? "Performance review updated" : "Performance review added" });
      queryClient.invalidateQueries({ queryKey: ["performance-logs"] });
    },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const submitSalary = useMutation({
    mutationFn: async (values: { payUserId: string; payAmount: string; payDate: string; payDesc: string }) => {
      if (!orgId || !userId || !values.payUserId || !values.payAmount) throw new Error("Fill required fields");
      const { error } = await supabase.from("worker_payments").insert({
        organization_id: orgId,
        created_by: userId,
        user_id: values.payUserId,
        type: "salary" as const,
        amount: parseFloat(values.payAmount),
        date: values.payDate || new Date().toISOString().split("T")[0],
        description: values.payDesc || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Salary payment recorded" });
      queryClient.invalidateQueries({ queryKey: ["salary-payments"] });
    },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteRecord = useMutation({
    mutationFn: async ({ id, table }: { id: string; table: string }) => {
      const { error } = await supabase.from(table as "recruitment" | "training_logs" | "employee_skills" | "disciplinary_records" | "promotions" | "performance_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Record deleted" });
      queryClient.invalidateQueries({ queryKey: ["recruitment"] });
      queryClient.invalidateQueries({ queryKey: ["training-logs"] });
      queryClient.invalidateQueries({ queryKey: ["employee-skills"] });
      queryClient.invalidateQueries({ queryKey: ["disciplinary"] });
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return {
    submitLeave,
    updateLeave,
    submitRecruitment,
    submitTraining,
    submitSkill,
    submitDisciplinary,
    submitPromotion,
    submitPerformance,
    submitSalary,
    deleteRecord,
  };
};
