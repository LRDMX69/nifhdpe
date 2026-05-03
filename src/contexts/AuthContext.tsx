import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { logger } from "@/lib/logger";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  organization_id: string | null;
}

interface UserMembership {
  organization_id: string;
  role: string;
  organization_name: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  memberships: UserMembership[];
  activeRole: string | null;
  activeOrganizationId: string | null;
  loading: boolean;
  isMaintenance: boolean;
  isMfaEnabled: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchRole: (role: string) => void;
  switchOrganization: (organizationId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isMfaEnabled, setIsMfaEnabled] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const activeOrgRef = useRef<string | null>(null);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      setAuthError(null);
      // Check if maintenance admin
      const { data: maintenanceCheck } = await supabase
        .from("system_maintenance_accounts")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      const isMaintenanceAdmin = !!maintenanceCheck;
      setIsMaintenance(isMaintenanceAdmin);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileData) {
        setProfile(profileData as UserProfile);
      }

      // Fetch ALL memberships (up to 2 roles)
      const { data: membershipData } = await supabase
        .from("organization_memberships")
        .select("organization_id, role, organizations(name)")
        .eq("user_id", userId);

      if (membershipData && membershipData.length > 0) {
        const mapped: UserMembership[] = membershipData.map((m) => ({
          organization_id: m.organization_id,
          role: m.role,
          organization_name: (m.organizations as unknown as { name: string })?.name ?? "",
        }));
        setMemberships(mapped);
        // Set the first organization as active if not already set (use ref to avoid stale-closure re-fetch loop)
        const currentOrg = activeOrgRef.current;
        if (!currentOrg) {
          activeOrgRef.current = mapped[0].organization_id;
          setActiveOrganizationId(mapped[0].organization_id);
        }
        // Maintenance admin always gets administrator view
        if (isMaintenanceAdmin) {
          setActiveRole("administrator");
        } else {
          // Set the role for the active organization
          const activeMembership = mapped.find(m => m.organization_id === activeOrgRef.current) || mapped[0];
          setActiveRole(activeMembership.role);
        }
      } else if (isMaintenanceAdmin) {
        // Maintenance admin with no memberships still gets admin access
        setActiveRole("administrator");
        setMemberships([{
          organization_id: "",
          role: "administrator",
          organization_name: "System",
        }]);
      }
    } catch (error) {
      logger.error("Error fetching user data/memberships:", error);
      setAuthError(error instanceof Error ? error.message : "Failed to load profile.");
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Check for MFA
        if (session?.user) {
          const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
          if (!factorsError && factors) {
            setIsMfaEnabled(factors.all.some(f => f.status === "verified"));
          }
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setProfile(null);
          setMemberships([]);
          setActiveRole(null);
          setActiveOrganizationId(null);
          activeOrgRef.current = null;
          setIsMaintenance(false);
          setIsMfaEnabled(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        setIsMfaEnabled(factors?.all.some(f => f.status === "verified") ?? false);
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setMemberships([]);
    setActiveRole(null);
    setActiveOrganizationId(null);
    activeOrgRef.current = null;
    setIsMaintenance(false);
  };

  const switchRole = (role: string) => {
    if (isMaintenance || memberships.some((m) => m.role === role)) {
      setActiveRole(role);
    }
  };

  const switchOrganization = (organizationId: string) => {
    const membership = memberships.find(m => m.organization_id === organizationId);
    if (membership) {
      activeOrgRef.current = organizationId;
      setActiveOrganizationId(organizationId);
      setActiveRole(membership.role);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        memberships,
        activeRole,
        activeOrganizationId,
        loading,
        isMaintenance,
        isMfaEnabled,
        authError,
        signIn,
        signUp,
        signOut,
        switchRole,
        switchOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
