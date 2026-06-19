import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Building2, Users, Shield, Check, X, Loader2, Camera, Trash2, Ban, UserX, MessageSquare, MapPin } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkflowBanner } from "@/components/ui/workflow-banner";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS, ALL_ROLES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { FeedbackInbox } from "@/components/feedback/FeedbackInbox";
import { humanizeError } from "@/lib/humanizeError";

function OfficeCoordinatesCard({ org, orgId, onSaved }: { org: { office_lat?: number | null; office_lng?: number | null } | null | undefined; orgId: string | undefined; onSaved: () => void }) {
  const { toast } = useToast();
  const [lat, setLat] = useState<string>(org?.office_lat != null ? String(org.office_lat) : "");
  const [lng, setLng] = useState<string>(org?.office_lng != null ? String(org.office_lng) : "");
  const [busy, setBusy] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const useCurrent = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS not supported", variant: "destructive" });
      return;
    }
    setBusy(true);
    setAccuracy(null);
    let best: GeolocationPosition | null = null;
    let samples = 0;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        samples++;
        if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
        if (best.coords.accuracy <= 25 || samples >= 5) {
          navigator.geolocation.clearWatch(id);
          setLat(best.coords.latitude.toFixed(7));
          setLng(best.coords.longitude.toFixed(7));
          setAccuracy(best.coords.accuracy);
          setBusy(false);
          toast({ title: "Captured current location", description: `Accuracy ±${Math.round(best.coords.accuracy)}m. Review and click Save.` });
        }
      },
      (err) => {
        navigator.geolocation.clearWatch(id);
        setBusy(false);
        toast({ title: "GPS error", description: err.message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
    setTimeout(() => { navigator.geolocation.clearWatch(id); setBusy(false); }, 21000);
  };

  const save = async () => {
    if (!orgId) return;
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    if (Number.isNaN(latN) || Number.isNaN(lngN)) {
      toast({ title: "Invalid coordinates", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("organizations").update({ office_lat: latN, office_lng: lngN }).eq("id", orgId);
    setBusy(false);
    if (error) toast({ title: "Error", description: humanizeError(error), variant: "destructive" });
    else { toast({ title: "Office coordinates updated" }); onSaved(); }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Office Coordinates</CardTitle>
        <CardDescription>Used for attendance check-in geofencing (1 km radius). Stand inside the office and tap "Use current location" for best accuracy.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Latitude</Label><Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="e.g. 6.552843" /></div>
          <div className="space-y-2"><Label>Longitude</Label><Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="e.g. 3.387812" /></div>
        </div>
        {accuracy != null && (
          <p className="text-xs text-muted-foreground">Captured with ±{Math.round(accuracy)}m GPS accuracy.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={useCurrent} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <MapPin className="h-4 w-4 mr-1" />}
            Use current location
          </Button>
          <Button type="button" onClick={save} disabled={busy}>Save coordinates</Button>
        </div>
      </CardContent>
    </Card>
  );
}

type RoleRequestRow = {
  id: string;
  user_id: string;
  organization_id: string;
  requested_roles: string[];
  status: string;
};

const AppSettings = () => {
  const { profile, memberships, user, isMaintenance } = useAuth();
  const isAdmin = isMaintenance || memberships.some((m) => m.role === "administrator");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = memberships[0]?.organization_id;

  const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["team-members", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.rpc("get_visible_members", { _org_id: orgId });
      if (!data) return [];
      const userIds = data.map((m: { user_id: string }) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, phone, avatar_url, terminated").in("user_id", userIds);
      const profileMap = new Map((profiles ?? []).map((p: { user_id: string; full_name: string | null; avatar_url: string | null; terminated?: boolean }) => [p.user_id, p]));
      return data.map((m: { user_id: string; id: string; role: string }) => ({
        ...m,
        full_name: profileMap.get(m.user_id)?.full_name ?? "Unknown",
        avatar_url: profileMap.get(m.user_id)?.avatar_url,
        terminated: profileMap.get(m.user_id)?.terminated ?? false,
      }));
    },
    enabled: !!orgId,
  });

  const { data: terminatedUsers = [] } = useQuery({
    queryKey: ["terminated-users", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, terminated_at")
        .eq("organization_id", orgId)
        .eq("terminated", true);
      return data ?? [];
    },
    enabled: !!orgId && isMaintenance === isMaintenance, // always
  });

  const callAdminAction = async (action: "terminate" | "delete", userId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated");
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-terminate-user`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ user_id: userId, organization_id: orgId, action }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Action failed (${res.status})`);
    }
  };

  const terminateUser = useMutation({
    mutationFn: (userId: string) => callAdminAction("terminate", userId),
    onSuccess: () => {
      toast({ title: "User terminated", description: "Access revoked. Their work has been preserved." });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["terminated-users"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-users"] });
    },
    onError: (err: Error) => toast({ title: "Failed", description: humanizeError(err), variant: "destructive" }),
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => callAdminAction("delete", userId),
    onSuccess: () => {
      toast({ title: "Account deleted", description: "Login removed. Their previous work is preserved." });
      queryClient.invalidateQueries({ queryKey: ["terminated-users"] });
    },
    onError: (err: Error) => toast({ title: "Failed", description: humanizeError(err), variant: "destructive" }),
  });

  const { data: unassignedUsers = [] } = useQuery({
    queryKey: ["unassigned-users", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data: allProfiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").eq("organization_id", orgId);
      if (!allProfiles) return [];
      const { data: allMemberships } = await supabase.from("organization_memberships").select("user_id").eq("organization_id", orgId);
      const assignedIds = new Set((allMemberships ?? []).map((m: { user_id: string }) => m.user_id));
      const { data: maintenanceAccounts } = await supabase.from("system_maintenance_accounts").select("user_id");
      const maintenanceIds = new Set((maintenanceAccounts ?? []).map((m: { user_id: string }) => m.user_id));
      return allProfiles.filter((p: { user_id: string }) => !assignedIds.has(p.user_id) && !maintenanceIds.has(p.user_id));
    },
    enabled: !!orgId,
  });

  const { data: pendingRoleRequests = [] } = useQuery({
    queryKey: ["pending-role-requests", orgId],
    queryFn: async () => {
      if (!orgId) return [] as RoleRequestRow[];
      const { data, error } = await (supabase as any)
        .from("role_assignment_requests")
        .select("id, user_id, organization_id, requested_roles, status")
        .eq("organization_id", orgId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RoleRequestRow[];
    },
    enabled: !!orgId,
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, roles, requestId }: { userId: string; roles: string[]; requestId?: string }) => {
      const unique = Array.from(new Set(roles.filter(Boolean))).slice(0, 2);
      if (unique.length === 0) throw new Error("Pick at least one role");
      const rows = unique.map((role) => ({
        user_id: userId,
        organization_id: orgId,
        role: role as Database["public"]["Enums"]["app_role"],
      }));
      const { error } = await supabase.from("organization_memberships").insert(rows);
      if (error) throw error;
      if (requestId) {
        const { error: requestError } = await (supabase as any)
          .from("role_assignment_requests")
          .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null })
          .eq("id", requestId);
        if (requestError) throw requestError;
      }
    },
    onSuccess: () => {
      toast({ title: "Roles assigned" });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-users"] });
      queryClient.invalidateQueries({ queryKey: ["pending-role-requests"] });
    },
    onError: (err: Error) => toast({ title: "Failed", description: humanizeError(err), variant: "destructive" }),
  });

  const removeMember = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase.from("organization_memberships").delete().eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Member removed" });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-users"] });
    },
  });

  const [selectedRolesForUser, setSelectedRolesForUser] = useState<Record<string, { primary: string; secondary: string }>>({});
  const setRoleSlot = (userId: string, slot: "primary" | "secondary", value: string) =>
    setSelectedRolesForUser((prev) => ({
      ...prev,
      [userId]: { primary: "", secondary: "", ...(prev[userId] ?? {}), [slot]: value === "__none__" ? "" : value },
    }));
  const [uploading, setUploading] = useState(false);

  const { data: org } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase.from("organizations").select("*").eq("id", orgId).single();
      return data;
    },
    enabled: !!orgId,
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !user) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const filePath = `avatars/${user.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from("site-photos").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("site-photos").getPublicUrl(uploadData.path);
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user.id);
      if (updateError) throw updateError;
      toast({ title: "Profile photo updated" });
    } catch (err: unknown) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string) => (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Settings"
        description="Organization and user settings"
        executiveSummary={`${teamMembers.length} active team members · ${pendingRoleRequests.length} pending role requests`}
      />

      <WorkflowBanner
        storageKey="settings"
        summary="Manage the organization profile, the team roster and your own account from a single place. Role changes here flow through to every module's permissions instantly."
        steps={[
          { actor: "Administrator", action: "updates company details and the organization logo — both appear on every PDF, ID card and the splash screen." },
          { actor: "Administrator", action: "assigns roles to team members (max 2 Admins). Pending users see the Awaiting Role screen until approved." },
          { actor: "You", action: "manage your own profile, avatar and security (password, MFA) in the Profile tab." },
        ]}
      />

      <Tabs defaultValue="team" className="space-y-4">
        <div className="w-full overflow-x-auto pb-1 scrollbar-hide">
          <TabsList className="flex w-max min-w-full sm:w-auto sm:inline-flex bg-muted/50 p-1 gap-1">
            <TabsTrigger value="organization" className="gap-1 text-xs sm:text-sm whitespace-nowrap"><Building2 className="h-3 w-3 hidden sm:block" /> Organization</TabsTrigger>
            <TabsTrigger value="team" className="gap-1 text-xs sm:text-sm whitespace-nowrap"><Users className="h-3 w-3 hidden sm:block" /> Team</TabsTrigger>
            <TabsTrigger value="profile" className="gap-1 text-xs sm:text-sm whitespace-nowrap"><Shield className="h-3 w-3 hidden sm:block" /> Profile</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="feedback" className="gap-1 text-xs sm:text-sm whitespace-nowrap"><MessageSquare className="h-3 w-3 hidden sm:block" /> User Feedback</TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="organization" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">Company Details</CardTitle><CardDescription>Your organization information</CardDescription></CardHeader>
            <CardContent>
              <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target as HTMLFormElement);
                const { error } = await supabase.from("organizations").update({
                  name: fd.get("name") as string, email: fd.get("email") as string,
                  phone: fd.get("phone") as string, address: fd.get("address") as string,
                }).eq("id", orgId);
                toast(error ? { title: "Error", description: humanizeError(error), variant: "destructive" as const } : { title: "Organization updated" });
              }}>
                <div className="space-y-2 sm:col-span-2"><Label>Company Name</Label><Input name="name" defaultValue={org?.name ?? ""} /></div>
                <div className="space-y-2"><Label>Email</Label><Input name="email" defaultValue={org?.email ?? ""} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input name="phone" defaultValue={org?.phone ?? ""} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Address</Label><Input name="address" defaultValue={org?.address ?? ""} /></div>
                <div className="sm:col-span-2"><Button type="submit">Save Changes</Button></div>
              </form>
            </CardContent>
          </Card>
          {isAdmin && <OfficeCoordinatesCard org={org} orgId={orgId} onSaved={() => queryClient.invalidateQueries({ queryKey: ["organization", orgId] })} />}
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          {unassignedUsers.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-warning flex items-center gap-2">⚠ Pending Role Assignment ({unassignedUsers.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {unassignedUsers.map((u: { user_id: string; full_name: string | null; avatar_url: string | null }) => {
                  const pendingRequest = pendingRoleRequests.find((request) => request.user_id === u.user_id);
                  const requestedRoles = pendingRequest?.requested_roles ?? [];
                  return (
                  <div key={u.user_id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="h-7 w-7">
                        {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                        <AvatarFallback className="text-[10px]">{getInitials(u.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <span className="text-sm font-medium truncate block">{u.full_name}</span>
                        {requestedRoles.length > 0 && (
                          <span className="text-[11px] text-muted-foreground block truncate">
                            Requested: {requestedRoles.map((role) => ROLE_LABELS[role] ?? role).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                     {(() => {
                       const slots = selectedRolesForUser[u.user_id] ?? { primary: "", secondary: "" };
                       const primary = slots.primary;
                       const secondary = slots.secondary;
                       const canSubmit = !!primary && primary !== secondary;
                       return (
                         <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                           <Select value={primary} onValueChange={v => setRoleSlot(u.user_id, "primary", v)}>
                             <SelectTrigger className="w-full sm:w-36 h-8 text-xs"><SelectValue placeholder="Primary role" /></SelectTrigger>
                             <SelectContent>{ALL_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                           </Select>
                           <Select value={secondary || "__none__"} onValueChange={v => setRoleSlot(u.user_id, "secondary", v)}>
                             <SelectTrigger className="w-full sm:w-40 h-8 text-xs"><SelectValue placeholder="Secondary (optional)" /></SelectTrigger>
                             <SelectContent>
                               <SelectItem value="__none__">None</SelectItem>
                               {ALL_ROLES.filter(r => r !== primary).map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                             </SelectContent>
                           </Select>
                           <Button
                             size="sm"
                             className="h-8"
                             disabled={!canSubmit || assignRole.isPending}
                             onClick={() => assignRole.mutate({ userId: u.user_id, roles: [primary, secondary].filter(Boolean), requestId: pendingRequest?.id })}
                           >
                             {assignRole.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                           </Button>
                         </div>
                       );
                     })()}
                  </div>
                )})}
              </CardContent>
            </Card>
          )}

          <p className="text-sm text-muted-foreground">{membersLoading ? "Loading..." : `${teamMembers.length} team members`}</p>
          <div className="space-y-2">
            {teamMembers.map((m: { id: string; user_id: string; full_name: string | null; avatar_url: string | null; role: string; terminated?: boolean }) => (
              <Card key={m.id} className="border-border/50">
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(m.full_name)}</AvatarFallback>
                    </Avatar>
                    <p className="font-medium text-sm truncate">{m.full_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={m.role === "administrator" ? "default" : "secondary"} className="capitalize text-xs">{ROLE_LABELS[m.role] ?? m.role}</Badge>
                    {m.user_id !== user?.id && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Remove role" onClick={() => removeMember.mutate(m.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Terminate user">
                              <Ban className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Terminate {m.full_name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This revokes all access immediately and signs them out. Their submitted work (reports, claims, projects) will be preserved. You can permanently delete the login afterward.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => terminateUser.mutate(m.user_id)}>Terminate</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {terminatedUsers.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/5 mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive flex items-center gap-2">
                  <UserX className="h-4 w-4" /> Terminated Accounts ({terminatedUsers.length})
                </CardTitle>
                <CardDescription>Permanently delete the login. Their past work is kept.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {terminatedUsers.map((u: { user_id: string; full_name: string | null; avatar_url: string | null; terminated_at: string | null }) => (
                  <div key={u.user_id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{getInitials(u.full_name)}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.full_name}</p>
                        {u.terminated_at && <p className="text-[10px] text-muted-foreground">Terminated {new Date(u.terminated_at).toLocaleDateString()}</p>}
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="h-7 text-xs"><Trash2 className="h-3 w-3 mr-1" />Delete Account</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Permanently delete {u.full_name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            The login will be removed and they cannot return. Their previous work stays in the system.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteUser.mutate(u.user_id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">Your Profile</CardTitle><CardDescription>Manage your personal information</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar upload */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-16 w-16">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">{getInitials(profile?.full_name ?? "")}</AvatarFallback>
                  </Avatar>
                  <label className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90">
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-medium">{profile?.full_name ?? "User"}</p>
                  <p className="text-xs text-muted-foreground">Click the camera icon to upload a profile photo</p>
                </div>
              </div>

              <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target as HTMLFormElement);
                const { error } = await supabase.from("profiles").update({
                  full_name: fd.get("full_name") as string, phone: fd.get("phone") as string,
                }).eq("user_id", user?.id);
                toast(error ? { title: "Error", description: humanizeError(error), variant: "destructive" as const } : { title: "Profile updated" });
              }}>
                <div className="space-y-2"><Label>Full Name</Label><Input name="full_name" defaultValue={profile?.full_name ?? ""} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input name="phone" defaultValue={profile?.phone ?? ""} /></div>
                <div className="sm:col-span-2"><Button type="submit">Update Profile</Button></div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="feedback" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">User Feedback</CardTitle>
                <CardDescription>Bugs, ideas and questions sent from across the app. Reply to close the loop with your team.</CardDescription>
              </CardHeader>
              <CardContent>
                <FeedbackInbox />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default AppSettings;
