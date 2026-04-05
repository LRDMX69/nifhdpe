import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarDays, Award, Users, Clock, AlertTriangle, Plus, Loader2, TrendingDown, GraduationCap, ShieldAlert, Star, Briefcase, MoreVertical, Pencil, Trash2, CreditCard, DollarSign } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGsapFadeUp } from "@/hooks/useGsapAnimation";
import { CheckInWidget } from "@/components/CheckInWidget";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { Database } from "@/integrations/supabase/types";

const HR = () => {
  const { user, memberships, activeRole, isMaintenance } = useAuth();
  const headerRef = useGsapFadeUp();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = memberships[0]?.organization_id;
  const isHrOrAdmin = activeRole === "hr" || activeRole === "administrator" || isMaintenance;

  // Leave request form
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  // Recruitment form
  const [recruitOpen, setRecruitOpen] = useState(false);
  const [editingRecruit, setEditingRecruit] = useState<Database["public"]["Tables"]["recruitment"]["Row"] | null>(null);
  const [recruitTitle, setRecruitTitle] = useState("");
  const [recruitDept, setRecruitDept] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");

  // Training form
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Database["public"]["Tables"]["training_logs"]["Row"] | null>(null);
  const [trainingTitle, setTrainingTitle] = useState("");
  const [trainingType, setTrainingType] = useState("internal");
  const [trainingUserId, setTrainingUserId] = useState("");
  const [trainingScore, setTrainingScore] = useState("");
  const [trainingNotes, setTrainingNotes] = useState("");

  // Skills form
  const [skillOpen, setSkillOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Database["public"]["Tables"]["employee_skills"]["Row"] | null>(null);
  const [skillName, setSkillName] = useState("");
  const [skillUserId, setSkillUserId] = useState("");
  const [skillLevel, setSkillLevel] = useState(3);
  const [skillCertified, setSkillCertified] = useState(false);

  // Disciplinary form
  const [discOpen, setDiscOpen] = useState(false);
  const [editingDisc, setEditingDisc] = useState<Database["public"]["Tables"]["disciplinary_records"]["Row"] | null>(null);
  const [discUserId, setDiscUserId] = useState("");
  const [discSeverity, setDiscSeverity] = useState("warning");
  const [discDescription, setDiscDescription] = useState("");
  const [discAction, setDiscAction] = useState("");

  // Promotion form
  const [promoOpen, setPromoOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Database["public"]["Tables"]["promotions"]["Row"] | null>(null);
  const [promoUserId, setPromoUserId] = useState("");
  const [promoPrevRole, setPromoPrevRole] = useState("");
  const [promoNewRole, setPromoNewRole] = useState("");
  const [promoDate, setPromoDate] = useState("");
  const [promoReason, setPromoReason] = useState("");

  // Performance form
  const [perfOpen, setPerfOpen] = useState(false);
  const [editingPerf, setEditingPerf] = useState<Database["public"]["Tables"]["performance_logs"]["Row"] | null>(null);
  const [perfUserId, setPerfUserId] = useState("");
  const [perfPeriod, setPerfPeriod] = useState("");
  const [perfRating, setPerfRating] = useState(3);
  const [perfNotes, setPerfNotes] = useState("");

  // Payroll form
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [payUserId, setPayUserId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payDesc, setPayDesc] = useState("");

  // ID Card dialog
  const [idCardOpen, setIdCardOpen] = useState(false);
  const [idCardUser, setIdCardUser] = useState<{ user_id: string } | null>(null);
  const [idCardTemp, setIdCardTemp] = useState(false);

  // Delete target
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; table: string; label: string } | null>(null);

  // Attendance date filter
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);

  // Attendance data
  const { data: allAttendance = [] } = useQuery({
    queryKey: ["attendance-all", orgId, attendanceDate],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("attendance").select("*").eq("organization_id", orgId).eq("date", attendanceDate).order("check_in", { ascending: false });
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

  const attendanceChartData = (() => {
    if (!isHrOrAdmin || weeklyAttendance.length === 0) return [];
    const byDate = new Map<string, { total: number; late: number; onTime: number }>();
    weeklyAttendance.forEach(a => {
      const d = a.date;
      if (!byDate.has(d)) byDate.set(d, { total: 0, late: 0, onTime: 0 });
      const entry = byDate.get(d)!;
      entry.total++;
      if (a.check_in && new Date(a.check_in).getHours() >= 9) entry.late++;
      else entry.onTime++;
    });
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date: date.slice(5), ...v }));
  })();

  const attendancePatterns = (() => {
    if (!isHrOrAdmin || weeklyAttendance.length === 0) return { lateArrivals: [], missingCheckouts: [], absentUsers: [] };
    const lateArrivals = weeklyAttendance.filter(a => a.check_in && new Date(a.check_in).getHours() >= 9);
    const missingCheckouts = weeklyAttendance.filter(a => a.check_in && !a.check_out && a.date !== new Date().toISOString().split("T")[0]);
    const userDays = new Map<string, number>();
    weeklyAttendance.forEach(a => userDays.set(a.user_id, (userDays.get(a.user_id) ?? 0) + 1));
    const absentUsers = [...userDays.entries()].filter(([, days]) => days < 3).map(([userId]) => userId);
    return { lateArrivals, missingCheckouts, absentUsers };
  })();

  const { data: profileMap = new Map() } = useQuery({
    queryKey: ["profiles-for-hr", orgId],
    queryFn: async () => {
      if (!orgId) return new Map();
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").eq("organization_id", orgId);
      return new Map((profiles ?? []).map((p: { user_id: string; full_name: string; avatar_url: string | null }) => [p.user_id, p]));
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

  const { data: orgInfo } = useQuery({
    queryKey: ["org-info-hr", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase.from("organizations").select("name, logo_url").eq("id", orgId).single();
      return data;
    },
    enabled: !!orgId && isHrOrAdmin,
  });

  const { data: leaveRequests = [] } = useQuery({ queryKey: ["leave-requests", orgId], queryFn: async () => { if (!orgId) return []; const { data } = await supabase.from("leave_requests").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(30); return data ?? []; }, enabled: !!orgId });
  const { data: performanceLogs = [] } = useQuery({ queryKey: ["performance-logs", orgId], queryFn: async () => { if (!orgId) return []; const { data } = await supabase.from("performance_logs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(20); return data ?? []; }, enabled: !!orgId && isHrOrAdmin });
  const { data: recruitment = [] } = useQuery({ queryKey: ["recruitment", orgId], queryFn: async () => { if (!orgId) return []; const { data } = await supabase.from("recruitment").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(30); return data ?? []; }, enabled: !!orgId && isHrOrAdmin });
  const { data: trainingLogs = [] } = useQuery({ queryKey: ["training-logs", orgId], queryFn: async () => { if (!orgId) return []; const { data } = await supabase.from("training_logs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(30); return data ?? []; }, enabled: !!orgId && isHrOrAdmin });
  const { data: skills = [] } = useQuery({ queryKey: ["employee-skills", orgId], queryFn: async () => { if (!orgId) return []; const { data } = await supabase.from("employee_skills").select("*").eq("organization_id", orgId).order("skill_name"); return data ?? []; }, enabled: !!orgId && isHrOrAdmin });
  const { data: disciplinary = [] } = useQuery({ queryKey: ["disciplinary", orgId], queryFn: async () => { if (!orgId) return []; const { data } = await supabase.from("disciplinary_records").select("*").eq("organization_id", orgId).order("incident_date", { ascending: false }).limit(20); return data ?? []; }, enabled: !!orgId && isHrOrAdmin });
  const { data: promotions = [] } = useQuery({ queryKey: ["promotions", orgId], queryFn: async () => { if (!orgId) return []; const { data } = await supabase.from("promotions").select("*").eq("organization_id", orgId).order("effective_date", { ascending: false }).limit(20); return data ?? []; }, enabled: !!orgId && isHrOrAdmin });

  // Payroll data
  const { data: salaryPayments = [] } = useQuery({
    queryKey: ["salary-payments", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("worker_payments").select("*").eq("organization_id", orgId).eq("type", "salary").order("date", { ascending: false }).limit(100);
      return data ?? [];
    },
    enabled: !!orgId && isHrOrAdmin,
  });

  // Mutations
  const submitLeave = useMutation({
    mutationFn: async () => {
      if (!orgId || !user) throw new Error("Not authenticated");
      if (!startDate || !endDate) throw new Error("Select dates");
      const { error } = await supabase.from("leave_requests").insert({ organization_id: orgId, user_id: user.id, leave_type: leaveType, start_date: startDate, end_date: endDate, reason: leaveReason || null });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Leave request submitted" }); setLeaveOpen(false); setStartDate(""); setEndDate(""); setLeaveReason(""); queryClient.invalidateQueries({ queryKey: ["leave-requests"] }); },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateLeave = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leave_requests").update({ status, approved_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => { toast({ title: `Leave ${status}` }); queryClient.invalidateQueries({ queryKey: ["leave-requests"] }); },
  });

  const submitRecruitment = useMutation({
    mutationFn: async () => {
      if (!orgId || !user) throw new Error("Not authenticated");
      const payload: Database["public"]["Tables"]["recruitment"]["Insert"] = { organization_id: orgId, position_title: recruitTitle, department: recruitDept || null, candidate_name: candidateName || null, candidate_email: candidateEmail || null, candidate_phone: candidatePhone || null };
      if (editingRecruit) {
        const { error } = await supabase.from("recruitment").update(payload).eq("id", editingRecruit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("recruitment").insert({ ...payload, created_by: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast({ title: editingRecruit ? "Updated" : "Added" }); setRecruitOpen(false); setEditingRecruit(null); setRecruitTitle(""); setRecruitDept(""); setCandidateName(""); setCandidateEmail(""); setCandidatePhone(""); queryClient.invalidateQueries({ queryKey: ["recruitment"] }); },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const submitTraining = useMutation({
    mutationFn: async () => {
      if (!orgId || !user || !trainingUserId) throw new Error("Select a member");
      const payload: Database["public"]["Tables"]["training_logs"]["Insert"] = { organization_id: orgId, user_id: trainingUserId, training_title: trainingTitle, training_type: trainingType || null, score: trainingScore ? parseInt(trainingScore) : null, notes: trainingNotes || null };
      if (editingTraining) {
        const { error } = await supabase.from("training_logs").update(payload).eq("id", editingTraining.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("training_logs").insert({ ...payload, created_by: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast({ title: editingTraining ? "Updated" : "Added" }); setTrainingOpen(false); setEditingTraining(null); setTrainingTitle(""); setTrainingUserId(""); setTrainingScore(""); setTrainingNotes(""); queryClient.invalidateQueries({ queryKey: ["training-logs"] }); },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const submitSkill = useMutation({
    mutationFn: async () => {
      if (!orgId || !skillUserId || !skillName) throw new Error("Fill required fields");
      const payload: Database["public"]["Tables"]["employee_skills"]["Insert"] = { organization_id: orgId, user_id: skillUserId, skill_name: skillName, proficiency_level: skillLevel, certified: skillCertified };
      if (editingSkill) {
        const { error } = await supabase.from("employee_skills").update(payload).eq("id", editingSkill.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employee_skills").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast({ title: editingSkill ? "Updated" : "Added" }); setSkillOpen(false); setEditingSkill(null); setSkillName(""); setSkillUserId(""); setSkillLevel(3); setSkillCertified(false); queryClient.invalidateQueries({ queryKey: ["employee-skills"] }); },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const submitDisciplinary = useMutation({
    mutationFn: async () => {
      if (!orgId || !user || !discUserId || !discDescription) throw new Error("Fill required fields");
      const payload: Database["public"]["Tables"]["disciplinary_records"]["Insert"] = { organization_id: orgId, user_id: discUserId, severity: discSeverity, description: discDescription, action_taken: discAction || null };
      if (editingDisc) {
        const { error } = await supabase.from("disciplinary_records").update(payload).eq("id", editingDisc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("disciplinary_records").insert({ ...payload, issued_by: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast({ title: editingDisc ? "Updated" : "Added" }); setDiscOpen(false); setEditingDisc(null); setDiscUserId(""); setDiscDescription(""); setDiscAction(""); queryClient.invalidateQueries({ queryKey: ["disciplinary"] }); },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const submitPromotion = useMutation({
    mutationFn: async () => {
      if (!orgId || !user || !promoUserId || !promoNewRole) throw new Error("Fill required fields");
      const payload: Database["public"]["Tables"]["promotions"]["Insert"] = {
        organization_id: orgId, user_id: promoUserId,
        previous_role: promoPrevRole || null, new_role: promoNewRole,
        effective_date: promoDate || new Date().toISOString().split("T")[0],
        reason: promoReason || null,
      };
      if (editingPromo) {
        const { error } = await supabase.from("promotions").update(payload).eq("id", editingPromo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("promotions").insert({ ...payload, approved_by: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast({ title: editingPromo ? "Updated" : "Promotion recorded" }); setPromoOpen(false); setEditingPromo(null); setPromoUserId(""); setPromoPrevRole(""); setPromoNewRole(""); setPromoDate(""); setPromoReason(""); queryClient.invalidateQueries({ queryKey: ["promotions"] }); },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const submitPerformance = useMutation({
    mutationFn: async () => {
      if (!orgId || !user || !perfUserId || !perfPeriod) throw new Error("Fill required fields");
      const payload = {
        organization_id: orgId,
        user_id: perfUserId,
        period: perfPeriod,
        rating: perfRating,
        notes: perfNotes || null,
      };
      if (editingPerf) {
        const { error } = await supabase.from("performance_logs").update(payload).eq("id", editingPerf.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("performance_logs").insert({ ...payload, created_by: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast({ title: editingPerf ? "Performance review updated" : "Performance review added" }); setPerfOpen(false); setEditingPerf(null); setPerfUserId(""); setPerfPeriod(""); setPerfRating(3); setPerfNotes(""); queryClient.invalidateQueries({ queryKey: ["performance-logs"] }); },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const submitSalary = useMutation({
    mutationFn: async () => {
      if (!orgId || !user || !payUserId || !payAmount) throw new Error("Fill required fields");
      const { error } = await supabase.from("worker_payments").insert({
        organization_id: orgId, created_by: user.id, user_id: payUserId,
        type: "salary" as const, amount: parseFloat(payAmount),
        date: payDate || new Date().toISOString().split("T")[0],
        description: payDesc || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Salary payment recorded" }); setPayrollOpen(false); setPayUserId(""); setPayAmount(""); setPayDate(""); setPayDesc(""); queryClient.invalidateQueries({ queryKey: ["salary-payments"] }); },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteRecord = useMutation({
    mutationFn: async ({ id, table }: { id: string; table: string }) => {
      const { error } = await supabase.from(table as "recruitment" | "training_logs" | "employee_skills" | "disciplinary_records" | "promotions" | "performance_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Record deleted" });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["recruitment"] });
      queryClient.invalidateQueries({ queryKey: ["training-logs"] });
      queryClient.invalidateQueries({ queryKey: ["employee-skills"] });
      queryClient.invalidateQueries({ queryKey: ["disciplinary"] });
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
    onError: (err: { message: string }) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const checkedInCount = allAttendance.filter((a: Database["public"]["Tables"]["attendance"]["Row"]) => a.check_in && !a.check_out).length;
  const completedCount = allAttendance.filter((a: Database["public"]["Tables"]["attendance"]["Row"]) => a.check_out).length;
  const getMemberName = (userId: string) => profileMap.get(userId)?.full_name ?? "Unknown";
  const memberOptions = membersList.map(m => ({ value: m.user_id, label: getMemberName(m.user_id) }));

  // Edit helpers
  const openEditRecruit = (r: Database["public"]["Tables"]["recruitment"]["Row"]) => { setEditingRecruit(r); setRecruitTitle(r.position_title); setRecruitDept(r.department ?? ""); setCandidateName(r.candidate_name ?? ""); setCandidateEmail(r.candidate_email ?? ""); setCandidatePhone(r.candidate_phone ?? ""); setRecruitOpen(true); };
  const openEditTraining = (t: Database["public"]["Tables"]["training_logs"]["Row"]) => { setEditingTraining(t); setTrainingTitle(t.training_title); setTrainingType(t.training_type ?? "internal"); setTrainingUserId(t.user_id); setTrainingScore(t.score?.toString() ?? ""); setTrainingNotes(t.notes ?? ""); setTrainingOpen(true); };
  const openEditSkill = (s: Database["public"]["Tables"]["employee_skills"]["Row"]) => { setEditingSkill(s); setSkillName(s.skill_name); setSkillUserId(s.user_id); setSkillLevel(s.proficiency_level); setSkillCertified(s.certified ?? false); setSkillOpen(true); };
  const openEditDisc = (d: Database["public"]["Tables"]["disciplinary_records"]["Row"]) => { setEditingDisc(d); setDiscUserId(d.user_id); setDiscSeverity(d.severity); setDiscDescription(d.description); setDiscAction(d.action_taken ?? ""); setDiscOpen(true); };
  const openEditPerf = (p: Database["public"]["Tables"]["performance_logs"]["Row"]) => {
    setEditingPerf(p);
    setPerfUserId(p.user_id);
    setPerfPeriod(p.period);
    setPerfRating(p.rating);
    setPerfNotes(p.notes || "");
    setPerfOpen(true);
  };
  const openEditPromo = (p: Database["public"]["Tables"]["promotions"]["Row"]) => { setEditingPromo(p); setPromoUserId(p.user_id); setPromoPrevRole(p.previous_role ?? ""); setPromoNewRole(p.new_role); setPromoDate(p.effective_date ?? ""); setPromoReason(p.reason ?? ""); setPromoOpen(true); };

  const handleGenerateIdCard = async () => {
    if (!idCardUser) return;
    const { generateIdCard } = await import("@/lib/generateIdCard");
    const profile = profileMap.get(idCardUser.user_id);
    const membership = membersList.find(m => m.user_id === idCardUser.user_id);
    const today = new Date();
    const expiry = new Date(today);
    expiry.setFullYear(expiry.getFullYear() + (idCardTemp ? 0 : 1));
    if (idCardTemp) expiry.setMonth(expiry.getMonth() + 3);

    await generateIdCard({
      employeeName: profile?.full_name ?? "Unknown",
      role: membership?.role ?? "staff",
      employeeNumber: `NIF-${idCardUser.user_id.slice(0, 8).toUpperCase()}`,
      organizationName: orgInfo?.name ?? "NIF Technical Services",
      isTemporary: idCardTemp,
      issueDate: today.toLocaleDateString("en-NG"),
      expiryDate: expiry.toLocaleDateString("en-NG"),
      avatarUrl: profile?.avatar_url,
      logoUrl: orgInfo?.logo_url,
    });
    toast({ title: "ID Card generated" });
    setIdCardOpen(false);
  };

  // Payroll summaries
  const payrollSummary = (() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthPayments = salaryPayments.filter((p: Database["public"]["Tables"]["worker_payments"]["Row"]) => p.date?.startsWith(thisMonth));
    const totalThisMonth = monthPayments.reduce((s: number, p: Database["public"]["Tables"]["worker_payments"]["Row"]) => s + Number(p.amount), 0);
    return { totalThisMonth, count: monthPayments.length, total: salaryPayments.length };
  })();

  /** Reusable actions dropdown for HR records */
  const RecordActions = ({ item, table, label, onEdit }: { item: { id: string }; table: string; label: string; onEdit: () => void }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget({ id: item.id, table, label })}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const roleOptions = ["administrator","engineer","technician","warehouse","finance","hr","reception_sales","knowledge_manager","siwes_trainee","it_student","nysc_member"];

  // Unique employees for ID cards
  const uniqueEmployees = (() => {
    const seen = new Set<string>();
    return membersList.filter(m => {
      if (seen.has(m.user_id)) return false;
      seen.add(m.user_id);
      return true;
    });
  })();

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div ref={headerRef} className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Human Resources</h1>
          <p className="text-muted-foreground text-sm">{isHrOrAdmin ? "Full HR management: attendance, recruitment, training, payroll, ID cards & more." : "Check in/out and leave requests."}</p>
        </div>
        <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Request Leave</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Request Leave</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Leave Type</Label>
                <Select value={leaveType} onValueChange={setLeaveType}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="annual">Annual Leave</SelectItem><SelectItem value="sick">Sick Leave</SelectItem><SelectItem value="emergency">Emergency</SelectItem><SelectItem value="maternity">Maternity/Paternity</SelectItem><SelectItem value="unpaid">Unpaid Leave</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>End Date</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Reason (Optional)</Label><Textarea value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="Brief reason..." rows={2} /></div>
              <Button className="w-full" onClick={() => submitLeave.mutate()} disabled={submitLeave.isPending}>{submitLeave.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Submit Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <CheckInWidget />

      {isHrOrAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[{ label: "Checked In", value: checkedInCount, icon: Clock }, { label: "Completed", value: completedCount, icon: Users }, { label: "Total Today", value: allAttendance.length, icon: CalendarDays }, { label: "Leave Pending", value: leaveRequests.filter((l: Database["public"]["Tables"]["leave_requests"]["Row"]) => l.status === "pending").length, icon: AlertTriangle }, { label: "Late (7d)", value: attendancePatterns.lateArrivals.length, icon: TrendingDown }].map(s => (
            <Card key={s.label}><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">{s.label}</p><p className="text-lg font-bold">{s.value}</p></CardContent></Card>
          ))}
        </div>
      )}

      {isHrOrAdmin && (attendancePatterns.lateArrivals.length > 3 || attendancePatterns.missingCheckouts.length > 0 || attendancePatterns.absentUsers.length > 0) && (
        <Card className="border-warning/30 bg-warning/5"><CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /><span className="text-sm font-medium">Attendance Irregularities Detected</span></div>
          {attendancePatterns.lateArrivals.length > 3 && <p className="text-xs text-muted-foreground">• {attendancePatterns.lateArrivals.length} late arrivals this week</p>}
          {attendancePatterns.missingCheckouts.length > 0 && <p className="text-xs text-muted-foreground">• {attendancePatterns.missingCheckouts.length} missing check-outs</p>}
          {attendancePatterns.absentUsers.length > 0 && <p className="text-xs text-muted-foreground">• {attendancePatterns.absentUsers.length} user(s) with &lt;3 check-ins this week</p>}
        </CardContent></Card>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this {deleteTarget?.label}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && deleteRecord.mutate({ id: deleteTarget.id, table: deleteTarget.table })}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ID Card Generation Dialog */}
      <Dialog open={idCardOpen} onOpenChange={setIdCardOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate ID Card</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                {idCardUser && profileMap.get(idCardUser.user_id)?.avatar_url && <AvatarImage src={profileMap.get(idCardUser.user_id)?.avatar_url} />}
                <AvatarFallback className="bg-primary/10 text-primary">{idCardUser ? getMemberName(idCardUser.user_id).split(" ").map((n) => n[0]).join("").slice(0, 2) : "?"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{idCardUser ? getMemberName(idCardUser.user_id) : ""}</p>
                <p className="text-xs text-muted-foreground capitalize">{idCardUser?.role?.replace(/_/g, " ")}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Card Type</Label>
              <Select value={idCardTemp ? "temporary" : "permanent"} onValueChange={v => setIdCardTemp(v === "temporary")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent (1 year validity)</SelectItem>
                  <SelectItem value="temporary">Temporary (3 months validity)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleGenerateIdCard}>
              <CreditCard className="h-4 w-4 mr-2" />Generate & Download ID Card
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue={isHrOrAdmin ? "attendance" : "leaves"} className="space-y-4">
        <TabsList className="w-full overflow-x-auto flex flex-nowrap h-auto justify-start">
          {isHrOrAdmin && <TabsTrigger value="attendance">Attendance</TabsTrigger>}
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
          {isHrOrAdmin && <TabsTrigger value="payroll">Payroll</TabsTrigger>}
          {isHrOrAdmin && <TabsTrigger value="idcards">ID Cards</TabsTrigger>}
          {isHrOrAdmin && <TabsTrigger value="performance">Performance</TabsTrigger>}
          {isHrOrAdmin && <TabsTrigger value="recruitment">Recruitment</TabsTrigger>}
          {isHrOrAdmin && <TabsTrigger value="training">Training</TabsTrigger>}
          {isHrOrAdmin && <TabsTrigger value="skills">Skills</TabsTrigger>}
          {isHrOrAdmin && <TabsTrigger value="disciplinary">Disciplinary</TabsTrigger>}
          {isHrOrAdmin && <TabsTrigger value="promotions">Promotions</TabsTrigger>}
        </TabsList>

        {/* ATTENDANCE TAB */}
        {isHrOrAdmin && (
          <TabsContent value="attendance" className="space-y-4">
            {attendanceChartData.length > 0 && (
              <Card className="border-border/50"><CardHeader className="pb-2"><CardTitle className="text-base">Weekly Attendance Trends</CardTitle></CardHeader><CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={attendanceChartData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" /><YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" /><Tooltip /><Bar dataKey="onTime" fill="hsl(var(--primary))" name="On Time" stackId="a" /><Bar dataKey="late" fill="hsl(var(--destructive))" name="Late" stackId="a" radius={[4, 4, 0, 0]} /></BarChart>
                </ResponsiveContainer>
              </CardContent></Card>
            )}
            <Card className="border-border/50"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Attendance Records</CardTitle><Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="w-auto text-sm" /></CardHeader><CardContent>
              {allAttendance.length === 0 ? <p className="text-sm text-muted-foreground">No records today.</p> : (
                <div className="space-y-2">{allAttendance.map((a: any) => {
                  const prof = profileMap.get(a.user_id);
                  const isLate = a.check_in && new Date(a.check_in).getHours() >= 9;
                  return (<div key={a.id} className={`flex items-center justify-between p-3 rounded-lg gap-2 flex-wrap ${isLate ? "bg-warning/10 border border-warning/20" : "bg-muted/30"}`}>
                    <div className="flex items-center gap-3 min-w-0"><Avatar className="h-8 w-8 shrink-0">{prof?.avatar_url && <AvatarImage src={prof.avatar_url} />}<AvatarFallback className="text-xs bg-primary/10 text-primary">{(prof?.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                      <div className="min-w-0"><p className="text-sm font-medium truncate">{prof?.full_name ?? "Unknown"}</p><p className="text-xs text-muted-foreground">In: {a.check_in ? new Date(a.check_in).toLocaleTimeString() : "—"}{a.check_out && ` · Out: ${new Date(a.check_out).toLocaleTimeString()}`}</p></div></div>
                    <div className="flex items-center gap-1">{isLate && <Badge variant="outline" className="text-[10px] text-warning border-warning/30">Late</Badge>}<Badge variant="outline" className={`text-[10px] ${a.check_out ? "text-primary" : "text-warning"}`}>{a.check_out ? "Complete" : "Active"}</Badge></div>
                  </div>);
                })}</div>
              )}
            </CardContent></Card>
          </TabsContent>
        )}

        {/* LEAVES TAB */}
        <TabsContent value="leaves"><Card className="border-border/50"><CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-5 w-5 text-warning" /> Leave Requests</CardTitle></CardHeader><CardContent>
          {leaveRequests.length > 0 ? (<div className="space-y-2">{leaveRequests.map((l: any) => {
            const requesterName = profileMap.get(l.user_id)?.full_name;
            return (<div key={l.id} className="flex items-center justify-between py-3 px-3 rounded-lg bg-muted/30 gap-2 flex-wrap">
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm capitalize font-medium">{l.leave_type} leave</p>{isHrOrAdmin && requesterName && <span className="text-xs text-muted-foreground">— {requesterName}</span>}</div><p className="text-xs text-muted-foreground">{l.start_date} → {l.end_date}</p>{l.reason && <p className="text-xs text-muted-foreground mt-1">{l.reason}</p>}</div>
              <div className="flex items-center gap-1 shrink-0">
                {isHrOrAdmin && l.status === "pending" && (<><Button size="sm" variant="outline" className="h-6 text-[10px] text-primary" onClick={() => updateLeave.mutate({ id: l.id, status: "approved" })}>Approve</Button><Button size="sm" variant="outline" className="h-6 text-[10px] text-destructive" onClick={() => updateLeave.mutate({ id: l.id, status: "rejected" })}>Reject</Button></>)}
                <Badge variant="outline" className={`text-[10px] capitalize ${l.status === "approved" ? "text-primary" : l.status === "rejected" ? "text-destructive" : "text-warning"}`}>{l.status}</Badge>
              </div>
            </div>);
          })}</div>) : <p className="text-sm text-muted-foreground">No leave requests.</p>}
        </CardContent></Card></TabsContent>

        {/* PAYROLL TAB */}
        {isHrOrAdmin && (
          <TabsContent value="payroll" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">This Month Total</p><p className="text-lg font-bold">₦{payrollSummary.totalThisMonth.toLocaleString()}</p></CardContent></Card>
              <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Payments This Month</p><p className="text-lg font-bold">{payrollSummary.count}</p></CardContent></Card>
              <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">All-Time Records</p><p className="text-lg font-bold">{payrollSummary.total}</p></CardContent></Card>
            </div>
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Salary Payments</CardTitle>
                <Dialog open={payrollOpen} onOpenChange={setPayrollOpen}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Record Salary</Button></DialogTrigger>
                  <DialogContent><DialogHeader><DialogTitle>Record Salary Payment</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label>Employee *</Label><Select value={payUserId} onValueChange={setPayUserId}><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{memberOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Amount (₦) *</Label><Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" /></div>
                        <div className="space-y-2"><Label>Date</Label><Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} /></div>
                      </div>
                      <div className="space-y-2"><Label>Description</Label><Input value={payDesc} onChange={e => setPayDesc(e.target.value)} placeholder="e.g. March 2026 Salary" /></div>
                      <Button className="w-full" onClick={() => submitSalary.mutate()} disabled={!payUserId || !payAmount || submitSalary.isPending}>{submitSalary.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Payment</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {salaryPayments.length > 0 ? (() => {
                  // Group payments by employee
                  const groupedByEmployee = new Map<string, any[]>();
                  salaryPayments.forEach((p: any) => {
                    if (!groupedByEmployee.has(p.user_id)) {
                      groupedByEmployee.set(p.user_id, []);
                    }
                    groupedByEmployee.get(p.user_id)!.push(p);
                  });
                  
                  return (
                    <div className="space-y-3">
                      {[...groupedByEmployee.entries()].map(([userId, payments]) => {
                        const totalAmount = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                        return (
                          <div key={userId} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  {profileMap.get(userId)?.avatar_url && <AvatarImage src={profileMap.get(userId).avatar_url} />}
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{(profileMap.get(userId)?.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <p className="text-sm font-medium">{getMemberName(userId)}</p>
                              </div>
                              <Badge variant="outline" className="text-xs font-semibold text-primary">₦{totalAmount.toLocaleString()}</Badge>
                            </div>
                            <div className="space-y-1 pl-8">
                              {payments.map((p: any) => (
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
                })() : <p className="text-sm text-muted-foreground">No salary records yet.</p>}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ID CARDS TAB */}
        {isHrOrAdmin && (
          <TabsContent value="idcards">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Employee ID Cards</CardTitle></CardHeader>
              <CardContent>
                {uniqueEmployees.length > 0 ? (<div className="space-y-2">{uniqueEmployees.map((m: any) => {
                  const prof = profileMap.get(m.user_id);
                  return (
                    <div key={m.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0">{prof?.avatar_url && <AvatarImage src={prof.avatar_url} />}<AvatarFallback className="text-xs bg-primary/10 text-primary">{(prof?.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                        <div className="min-w-0"><p className="text-sm font-medium truncate">{prof?.full_name ?? "Unknown"}</p><p className="text-xs text-muted-foreground capitalize">{m.role?.replace(/_/g, " ")}</p></div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => { setIdCardUser(m); setIdCardTemp(false); setIdCardOpen(true); }}>
                        <CreditCard className="h-3.5 w-3.5 mr-1" />Generate ID
                      </Button>
                    </div>
                  );
                })}</div>) : <p className="text-sm text-muted-foreground">No employees found.</p>}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* PERFORMANCE TAB */}
        {isHrOrAdmin && (
          <TabsContent value="performance"><Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Performance Logs</CardTitle>
              <Dialog open={perfOpen} onOpenChange={(o) => { setPerfOpen(o); if (!o) setEditingPerf(null); }}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Review</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>{editingPerf ? "Edit" : "Add"} Performance Review</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Member *</Label><Select value={perfUserId} onValueChange={setPerfUserId}><SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger><SelectContent>{memberOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Period *</Label><Input value={perfPeriod} onChange={e => setPerfPeriod(e.target.value)} placeholder="e.g. Q1 2026, January 2026" /></div>
                    <div className="space-y-2"><Label>Rating: {perfRating}/5</Label><Slider value={[perfRating]} onValueChange={([v]) => setPerfRating(v)} min={1} max={5} step={1} className="mt-2" /></div>
                    <div className="space-y-2"><Label>Notes</Label><Textarea value={perfNotes} onChange={e => setPerfNotes(e.target.value)} rows={3} placeholder="Performance assessment details..." /></div>
                    <Button className="w-full" onClick={() => submitPerformance.mutate()} disabled={!perfUserId || !perfPeriod || submitPerformance.isPending}>{submitPerformance.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingPerf ? "Update" : "Save"} Review</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {performanceLogs.length > 0 ? (<div className="space-y-2">{performanceLogs.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                  <div className="min-w-0"><p className="text-sm font-medium">{getMemberName(p.user_id)} — {p.period}</p>{p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}</div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={`text-[10px] ${p.rating >= 4 ? "text-primary" : p.rating >= 3 ? "text-warning" : "text-destructive"}`}>{p.rating}/5</Badge>
                    <RecordActions item={p} table="performance_logs" label="performance review" onEdit={() => openEditPerf(p)} />
                  </div>
                </div>
              ))}</div>) : <p className="text-sm text-muted-foreground">No performance reviews yet.</p>}
            </CardContent>
          </Card></TabsContent>
        )}

        {/* RECRUITMENT TAB */}
        {isHrOrAdmin && (
          <TabsContent value="recruitment"><Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /> Recruitment</CardTitle>
              <Dialog open={recruitOpen} onOpenChange={(o) => { setRecruitOpen(o); if (!o) setEditingRecruit(null); }}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>{editingRecruit ? "Edit" : "New"} Recruitment Entry</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Position Title *</Label><Input value={recruitTitle} onChange={e => setRecruitTitle(e.target.value)} placeholder="e.g. Senior Pipe Technician" /></div>
                    <div className="space-y-2"><Label>Department</Label><Input value={recruitDept} onChange={e => setRecruitDept(e.target.value)} placeholder="e.g. Engineering" /></div>
                    <div className="space-y-2"><Label>Candidate Name</Label><Input value={candidateName} onChange={e => setCandidateName(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Email</Label><Input type="email" value={candidateEmail} onChange={e => setCandidateEmail(e.target.value)} /></div><div className="space-y-2"><Label>Phone</Label><Input value={candidatePhone} onChange={e => setCandidatePhone(e.target.value)} /></div></div>
                    <Button className="w-full" onClick={() => submitRecruitment.mutate()} disabled={!recruitTitle || submitRecruitment.isPending}>{submitRecruitment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {recruitment.length > 0 ? (<div className="space-y-2">{recruitment.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                  <div className="min-w-0"><p className="text-sm font-medium">{r.position_title}</p><p className="text-xs text-muted-foreground">{r.candidate_name ?? "No candidate"} · {r.department ?? "—"}</p></div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={`text-[10px] capitalize ${r.status === "hired" ? "text-primary" : r.status === "rejected" ? "text-destructive" : "text-warning"}`}>{r.status}</Badge>
                    <RecordActions item={r} table="recruitment" label="recruitment entry" onEdit={() => openEditRecruit(r)} />
                  </div>
                </div>
              ))}</div>) : <p className="text-sm text-muted-foreground">No recruitment entries.</p>}
            </CardContent>
          </Card></TabsContent>
        )}

        {/* TRAINING TAB */}
        {isHrOrAdmin && (
          <TabsContent value="training"><Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> Training Logs</CardTitle>
              <Dialog open={trainingOpen} onOpenChange={(o) => { setTrainingOpen(o); if (!o) setEditingTraining(null); }}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Log Training</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>{editingTraining ? "Edit" : "Log"} Training</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Training Title *</Label><Input value={trainingTitle} onChange={e => setTrainingTitle(e.target.value)} placeholder="e.g. Pipe Welding Safety" /></div>
                    <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Type</Label><Select value={trainingType} onValueChange={setTrainingType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="internal">Internal</SelectItem><SelectItem value="external">External</SelectItem><SelectItem value="certification">Certification</SelectItem><SelectItem value="safety">Safety</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2"><Label>Score</Label><Input type="number" value={trainingScore} onChange={e => setTrainingScore(e.target.value)} placeholder="0-100" /></div></div>
                    <div className="space-y-2"><Label>Member *</Label><Select value={trainingUserId} onValueChange={setTrainingUserId}><SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger><SelectContent>{memberOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Notes</Label><Textarea value={trainingNotes} onChange={e => setTrainingNotes(e.target.value)} rows={2} /></div>
                    <Button className="w-full" onClick={() => submitTraining.mutate()} disabled={!trainingTitle || !trainingUserId || submitTraining.isPending}>{submitTraining.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {trainingLogs.length > 0 ? (<div className="space-y-2">{trainingLogs.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                  <div className="min-w-0"><p className="text-sm font-medium">{t.training_title}</p><p className="text-xs text-muted-foreground">{getMemberName(t.user_id)} · {t.training_type ?? "—"}{t.completed_date ? ` · Done: ${t.completed_date}` : ""}</p></div>
                  <div className="flex items-center gap-1">{t.score != null && <Badge variant="outline" className="text-[10px]">{t.score}%</Badge>}<RecordActions item={t} table="training_logs" label="training log" onEdit={() => openEditTraining(t)} /></div>
                </div>
              ))}</div>) : <p className="text-sm text-muted-foreground">No training logs.</p>}
            </CardContent>
          </Card></TabsContent>
        )}

        {/* SKILLS TAB */}
        {isHrOrAdmin && (
          <TabsContent value="skills"><Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Star className="h-5 w-5 text-primary" /> Employee Skills Matrix</CardTitle>
              <Dialog open={skillOpen} onOpenChange={(o) => { setSkillOpen(o); if (!o) setEditingSkill(null); }}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Skill</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>{editingSkill ? "Edit" : "Add"} Employee Skill</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Member *</Label><Select value={skillUserId} onValueChange={setSkillUserId}><SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger><SelectContent>{memberOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Skill Name *</Label><Input value={skillName} onChange={e => setSkillName(e.target.value)} placeholder="e.g. HDPE Butt Fusion" /></div>
                    <div className="space-y-2"><Label>Proficiency: {skillLevel}/5</Label><Slider value={[skillLevel]} onValueChange={([v]) => setSkillLevel(v)} min={1} max={5} step={1} className="mt-2" /></div>
                    <div className="flex items-center gap-2"><input type="checkbox" id="certified" checked={skillCertified} onChange={e => setSkillCertified(e.target.checked)} /><Label htmlFor="certified">Certified</Label></div>
                    <Button className="w-full" onClick={() => submitSkill.mutate()} disabled={!skillName || !skillUserId || submitSkill.isPending}>{submitSkill.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {skills.length > 0 ? (<div className="space-y-2">{skills.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                  <div className="min-w-0"><p className="text-sm font-medium">{s.skill_name}</p><p className="text-xs text-muted-foreground">{getMemberName(s.user_id)}</p></div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => (<div key={i} className={`h-2 w-2 rounded-full ${i < s.proficiency_level ? "bg-primary" : "bg-muted"}`} />))}</div>
                    {s.certified && <Badge variant="outline" className="text-[10px] text-primary">Certified</Badge>}
                    <RecordActions item={s} table="employee_skills" label="skill" onEdit={() => openEditSkill(s)} />
                  </div>
                </div>
              ))}</div>) : <p className="text-sm text-muted-foreground">No skills recorded.</p>}
            </CardContent>
          </Card></TabsContent>
        )}

        {/* DISCIPLINARY TAB */}
        {isHrOrAdmin && (
          <TabsContent value="disciplinary"><Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-destructive" /> Disciplinary Records</CardTitle>
              <Dialog open={discOpen} onOpenChange={(o) => { setDiscOpen(o); if (!o) setEditingDisc(null); }}>
                <DialogTrigger asChild><Button size="sm" variant="destructive"><Plus className="h-4 w-4 mr-1" />Record</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>{editingDisc ? "Edit" : "New"} Disciplinary Record</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Member *</Label><Select value={discUserId} onValueChange={setDiscUserId}><SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger><SelectContent>{memberOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label>Severity</Label><Select value={discSeverity} onValueChange={setDiscSeverity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="warning">Warning</SelectItem><SelectItem value="written_warning">Written Warning</SelectItem><SelectItem value="suspension">Suspension</SelectItem><SelectItem value="termination">Termination</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>Description *</Label><Textarea value={discDescription} onChange={e => setDiscDescription(e.target.value)} rows={3} placeholder="Describe the incident..." /></div>
                    <div className="space-y-2"><Label>Action Taken</Label><Input value={discAction} onChange={e => setDiscAction(e.target.value)} placeholder="e.g. Verbal warning issued" /></div>
                    <Button className="w-full" onClick={() => submitDisciplinary.mutate()} disabled={!discUserId || !discDescription || submitDisciplinary.isPending}>{submitDisciplinary.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {disciplinary.length > 0 ? (<div className="space-y-2">{disciplinary.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                  <div className="min-w-0"><p className="text-sm font-medium">{getMemberName(d.user_id)}</p><p className="text-xs text-muted-foreground">{d.description.slice(0, 80)}{d.description.length > 80 ? "..." : ""}</p><p className="text-[10px] text-muted-foreground">{d.incident_date}{d.action_taken ? ` · ${d.action_taken}` : ""}</p></div>
                  <div className="flex items-center gap-1"><Badge variant="outline" className={`text-[10px] capitalize ${d.severity === "termination" || d.severity === "suspension" ? "text-destructive" : "text-warning"}`}>{d.severity.replace("_", " ")}</Badge><RecordActions item={d} table="disciplinary_records" label="record" onEdit={() => openEditDisc(d)} /></div>
                </div>
              ))}</div>) : <p className="text-sm text-muted-foreground">No disciplinary records.</p>}
            </CardContent>
          </Card></TabsContent>
        )}

        {/* PROMOTIONS TAB */}
        {isHrOrAdmin && (
          <TabsContent value="promotions"><Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Promotion History</CardTitle>
              <Dialog open={promoOpen} onOpenChange={(o) => { setPromoOpen(o); if (!o) setEditingPromo(null); }}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Promotion</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>{editingPromo ? "Edit" : "Record"} Promotion</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Member *</Label><Select value={promoUserId} onValueChange={setPromoUserId}><SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger><SelectContent>{memberOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Previous Role</Label><Select value={promoPrevRole} onValueChange={setPromoPrevRole}><SelectTrigger><SelectValue placeholder="Previous" /></SelectTrigger><SelectContent>{roleOptions.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>New Role *</Label><Select value={promoNewRole} onValueChange={setPromoNewRole}><SelectTrigger><SelectValue placeholder="New role" /></SelectTrigger><SelectContent>{roleOptions.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <div className="space-y-2"><Label>Effective Date</Label><Input type="date" value={promoDate} onChange={e => setPromoDate(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Reason</Label><Textarea value={promoReason} onChange={e => setPromoReason(e.target.value)} rows={2} placeholder="Reason for promotion..." /></div>
                    <Button className="w-full" onClick={() => submitPromotion.mutate()} disabled={!promoUserId || !promoNewRole || submitPromotion.isPending}>{submitPromotion.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {promotions.length > 0 ? (<div className="space-y-2">{promotions.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2">
                  <div className="min-w-0"><p className="text-sm font-medium">{getMemberName(p.user_id)}</p><p className="text-xs text-muted-foreground">{p.previous_role ?? "—"} → {p.new_role} · {p.effective_date}</p>{p.reason && <p className="text-[10px] text-muted-foreground">{p.reason}</p>}</div>
                  <div className="flex items-center gap-1"><Badge variant="outline" className="text-[10px] text-primary">Promoted</Badge><RecordActions item={p} table="promotions" label="promotion" onEdit={() => openEditPromo(p)} /></div>
                </div>
              ))}</div>) : <p className="text-sm text-muted-foreground">No promotion records.</p>}
            </CardContent>
          </Card></TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default HR;
