import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { HRConnectedOperationsView } from "@/components/hr/HRConnectedOperationsView";

type Member = { user_id: string; role: string };
type Profile = { full_name?: string | null; account_number?: string | null };

export function MaintenanceHROversight() {
  const { user, memberships, activeRole, isMaintenance } = useAuth();
  const orgId = memberships[0]?.organization_id;

  const { data: members = [] } = useQuery({
    queryKey: ["members-list-hr", orgId],
    queryFn: async () => {
      if (!orgId) return [] as Member[];
      const { data, error } = await supabase.from("organization_memberships").select("user_id, role").eq("organization_id", orgId);
      if (error) throw error;
      return (data ?? []) as Member[];
    },
    enabled: !!orgId && isMaintenance,
  });

  const { data: profileMap = new Map<string, Profile>() } = useQuery({
    queryKey: ["profiles-for-hr", orgId],
    queryFn: async () => {
      if (!orgId) return new Map<string, Profile>();
      const { data, error } = await (supabase as any).rpc("get_org_payroll_profiles", { _org_id: orgId });
      if (error) throw error;
      return new Map<string, Profile>(((data as Array<Profile & { user_id: string }>) ?? []).map((item) => [item.user_id, item]));
    },
    enabled: !!orgId && isMaintenance,
  });

  if (!isMaintenance) return null;

  return (
    <section aria-labelledby="maintenance-hr-oversight" className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Maintenance oversight</p>
        <h2 id="maintenance-hr-oversight" className="mt-1 text-lg font-semibold">HR operations from the Administrator dashboard</h2>
        <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">Review the HR context that crosses into finance, commercial delivery, and bank review without switching into the HR role. Use the owning module for full editing.</p>
      </div>
      <HRConnectedOperationsView orgId={orgId} userId={user?.id} members={members} profileMap={profileMap} activeRole={activeRole ?? "administrator"} />
    </section>
  );
}
