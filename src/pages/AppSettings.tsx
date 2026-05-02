import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Building2, Users, Shield, Check, X, Loader2, Camera, Trash2, Ban, UserX } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS, ALL_ROLES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

const AppSettings = () => {
  const { profile, memberships, user, isMaintenance } = useAuth();
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
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => callAdminAction("delete", userId),
    onSuccess: () => {
      toast({ title: "Account deleted", description: "Login removed. Their previous work is preserved." });
      queryClient.invalidateQueries({ queryKey: ["terminated-users"] });
    },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
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

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("organization_memberships").insert({ user_id: userId, organization_id: orgId, role: role as Database["public"]["Enums"]["app_role"] });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Role assigned" });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-users"] });
    },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
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

  const [selectedRoleForUser, setSelectedRoleForUser] = useState<Record<string, string>>({});
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
      <PageHeader title="Settings" description="Organization and user settings" />

      <Tabs defaultValue="team" className="space-y-4">
        <div className="w-full overflow-x-auto pb-1 scrollbar-hide">
          <TabsList className="flex w-max min-w-full sm:w-auto sm:inline-flex bg-muted/50 p-1 gap-1">
            <TabsTrigger value="organization" className="gap-1 text-xs sm:text-sm whitespace-nowrap"><Building2 className="h-3 w-3 hidden sm:block" /> Organization</TabsTrigger>
            <TabsTrigger value="team" className="gap-1 text-xs sm:text-sm whitespace-nowrap"><Users className="h-3 w-3 hidden sm:block" /> Team</TabsTrigger>
            <TabsTrigger value="profile" className="gap-1 text-xs sm:text-sm whitespace-nowrap"><Shield className="h-3 w-3 hidden sm:block" /> Profile</TabsTrigger>
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
                toast(error ? { title: "Error", description: error.message, variant: "destructive" as const } : { title: "Organization updated" });
              }}>
                <div className="space-y-2 sm:col-span-2"><Label>Company Name</Label><Input name="name" defaultValue={org?.name ?? ""} /></div>
                <div className="space-y-2"><Label>Email</Label><Input name="email" defaultValue={org?.email ?? ""} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input name="phone" defaultValue={org?.phone ?? ""} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Address</Label><Input name="address" defaultValue={org?.address ?? ""} /></div>
                <div className="sm:col-span-2"><Button type="submit">Save Changes</Button></div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          {unassignedUsers.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-warning flex items-center gap-2">⚠ Pending Role Assignment ({unassignedUsers.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {unassignedUsers.map((u: { user_id: string; full_name: string | null; avatar_url: string | null }) => (
                  <div key={u.user_id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="h-7 w-7">
                        {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                        <AvatarFallback className="text-[10px]">{getInitials(u.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">{u.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={selectedRoleForUser[u.user_id] ?? ""} onValueChange={v => setSelectedRoleForUser(p => ({ ...p, [u.user_id]: v }))}>
                        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>{ALL_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="sm" className="h-8" disabled={!selectedRoleForUser[u.user_id] || assignRole.isPending} onClick={() => assignRole.mutate({ userId: u.user_id, role: selectedRoleForUser[u.user_id] })}>
                        {assignRole.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
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
                toast(error ? { title: "Error", description: error.message, variant: "destructive" as const } : { title: "Profile updated" });
              }}>
                <div className="space-y-2"><Label>Full Name</Label><Input name="full_name" defaultValue={profile?.full_name ?? ""} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input name="phone" defaultValue={profile?.phone ?? ""} /></div>
                <div className="sm:col-span-2"><Button type="submit">Update Profile</Button></div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AppSettings;
