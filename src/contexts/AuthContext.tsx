import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { logger } from "@/lib/logger";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getAppUrl } from "@/lib/appUrl";

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

      // Resilient check: use maybeSingle() instead of single() to prevent PostgrestError rejection if trigger lag occurs
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError) {
        logger.error("Error fetching profile:", profileError);
      } else if (profileData) {
        setProfile(profileData as UserProfile);
      }

      // Fetch ALL memberships (up to 2 roles)
      const { data: membershipData, error: membershipError } = await supabase
        .from("organization_memberships")
        .select("organization_id, role, organizations(name)")
        .eq("user_id", userId);

      let loadedMemberships = membershipData || [];

      if (!membershipError && loadedMemberships.length === 0 && profileData?.organization_id) {
        const pendingRolesStr = localStorage.getItem("nif_pending_roles");
        let rolesToAssign: string[] = ["technician"];
        if (pendingRolesStr) {
          try {
            const parsed = JSON.parse(pendingRolesStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              rolesToAssign = parsed;
            }
          } catch (e) {
            logger.error("Error parsing pending roles from localStorage:", e);
          }
        }

        logger.info(`Auto-assigning memberships for user ${userId} to org ${profileData.organization_id} with roles ${rolesToAssign.join(", ")}`);

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;
          if (!accessToken) {
            const message = "Missing access token for role assignment";
            logger.error(message);
            setAuthError(message);
          } else {
            const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assign-pending-roles`;
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({ user_id: userId, organization_id: profileData.organization_id, roles: rolesToAssign.slice(0, 2) })
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
              const message = payload?.error ? (Array.isArray(payload.error) ? payload.error.join("; ") : payload.error) : (payload?.detail ? JSON.stringify(payload.detail) : "Role assignment failed");
              logger.error("assign-pending-roles failed", payload);
              setAuthError(message);
            } else {
              localStorage.removeItem("nif_pending_roles");
            }
          }
        } catch (e) {
          logger.error("assign-pending-roles request failed", e);
          setAuthError(e instanceof Error ? e.message : "Role assignment request failed");
        }

        // Refetch memberships
        const { data: refetchedData, error: refetchError } = await supabase
          .from("organization_memberships")
          .select("organization_id, role, organizations(name)")
          .eq("user_id", userId);

        if (!refetchError && refetchedData) {
          loadedMemberships = refetchedData;
        }
      }

      if (membershipError) {
        logger.error("Error fetching memberships:", membershipError);
      } else if (loadedMemberships && loadedMemberships.length > 0) {
        const mapped: UserMembership[] = loadedMemberships.map((m) => ({
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
      } else {
        setMemberships([]);
        setActiveRole(null);
      }
    } catch (error) {
      logger.error("Error fetching user data/memberships:", error);
      setAuthError(error instanceof Error ? error.message : "Failed to load profile.");
    }
  }, []);

  useEffect(() => {
    let active = true;

    const handleSession = async (session: Session | null) => {
      if (!active) return;
      
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          // Await atomic loading of all dependencies so we do not trigger early redirects with empty memberships
          await fetchUserData(session.user.id);
          
          try {
            const { data: factors } = await supabase.auth.mfa.listFactors();
            if (active) {
              setIsMfaEnabled(factors?.all.some(f => f.status === "verified") ?? false);
            }
          } catch (e) {
            logger.error("MFA listFactors failed", e);
          }
        } catch (error) {
          logger.error("Error inside handleSession:", error);
        }
      } else {
        if (active) {
          setProfile(null);
          setMemberships([]);
          setActiveRole(null);
          setActiveOrganizationId(null);
          activeOrgRef.current = null;
          setIsMaintenance(false);
          setIsMfaEnabled(false);
        }
      }
      
      if (active) {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.info(`Supabase Auth Event: ${event}`);
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (active) setLoading(true);
        }
        await handleSession(session);
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        handleSession(session);
      })
      .catch((e) => {
        logger.error("getSession failed", e);
        if (active) setLoading(false);
      });

    // Safety net: never let loading hang past 8s no matter what.
    const safety = setTimeout(() => {
      if (active) setLoading(false);
    }, 8000);

    return () => {
      active = false;
      subscription.unsubscribe();
      clearTimeout(safety);
    };
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
        emailRedirectTo: getAppUrl(),
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
    const isLocalDev = window.location.hostname.includes("localhost");
    if (isMaintenance || isLocalDev || memberships.some((m) => m.role === role)) {
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
        isMaintenance: isMaintenance || (user ? window.location.hostname.includes("localhost") : false),
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
