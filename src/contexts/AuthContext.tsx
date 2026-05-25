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
  signUp: (email: string, password: string, fullName: string, requestedRoles: string[]) => Promise<{ error: Error | null }>;
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
  const lastSessionKeyRef = useRef<string | null>(null);

  const clearUserState = useCallback(() => {
    setProfile(null);
    setMemberships([]);
    setActiveRole(null);
    setActiveOrganizationId(null);
    activeOrgRef.current = null;
    setIsMaintenance(false);
    setIsMfaEnabled(false);
    setAuthError(null);
  }, []);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      setAuthError(null);
      const [maintenanceResult, profileResult, membershipResult] = await Promise.all([
        supabase
          .from("system_maintenance_accounts")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("organization_memberships")
          .select("organization_id, role, organizations(name)")
          .eq("user_id", userId),
      ]);

      const isMaintenanceAdmin = !!maintenanceResult.data;
      setIsMaintenance(isMaintenanceAdmin);

      const { data: profileData, error: profileError } = profileResult;
      const { data: membershipData, error: membershipError } = membershipResult;

      if (profileError) {
        logger.error("Error fetching profile:", profileError);
        setAuthError("We couldn't load your account profile. Please refresh or contact an administrator.");
      }
      setProfile((profileData as UserProfile | null) ?? null);

      const loadedMemberships = membershipData ?? [];

      if (membershipError) {
        logger.error("Error fetching memberships:", membershipError);
        setMemberships([]);
        setActiveRole(null);
        if (!profileError) {
          setAuthError("We couldn't load your access permissions. Please refresh or contact an administrator.");
        }
      } else if (loadedMemberships.length > 0) {
        const mapped: UserMembership[] = loadedMemberships.map((m) => ({
          organization_id: m.organization_id,
          role: m.role,
          organization_name: (m.organizations as unknown as { name: string })?.name ?? "",
        }));
        setMemberships(mapped);

        const preferredOrg = activeOrgRef.current && mapped.some((membership) => membership.organization_id === activeOrgRef.current)
          ? activeOrgRef.current
          : mapped[0].organization_id;

        activeOrgRef.current = preferredOrg;
        setActiveOrganizationId(preferredOrg);

        if (isMaintenanceAdmin) {
          setActiveRole("administrator");
        } else {
          const activeMembership = mapped.find((membership) => membership.organization_id === preferredOrg) ?? mapped[0];
          setActiveRole(activeMembership.role);
        }
      } else if (isMaintenanceAdmin) {
        setActiveRole("administrator");
        setMemberships([{
          organization_id: "",
          role: "administrator",
          organization_name: "System",
        }]);
        setActiveOrganizationId("");
      } else {
        setMemberships([]);
        setActiveRole(null);
        setActiveOrganizationId(profileData?.organization_id ?? null);
      }
    } catch (error) {
      logger.error("Error fetching user data/memberships:", error);
      setAuthError(error instanceof Error ? error.message : "Failed to load profile.");
      setMemberships([]);
      setActiveRole(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const handleSession = async (nextSession: Session | null) => {
      if (!active) return;

      const sessionKey = nextSession?.access_token ?? nextSession?.user?.id ?? "signed-out";
      if (lastSessionKeyRef.current === sessionKey) {
        setLoading(false);
        return;
      }
      lastSessionKeyRef.current = sessionKey;

      setLoading(true);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        try {
          await fetchUserData(nextSession.user.id);

          try {
            const { data: factors } = await supabase.auth.mfa.listFactors();
            if (active) {
              setIsMfaEnabled(factors?.all.some((factor) => factor.status === "verified") ?? false);
            }
          } catch (e) {
            logger.error("MFA listFactors failed", e);
          }
        } catch (error) {
          logger.error("Error inside handleSession:", error);
        } finally {
          if (active) setLoading(false);
        }
      } else {
        if (active) {
          clearUserState();
          setLoading(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
        logger.info(`Supabase Auth Event: ${event}`);
        if (!active) return;
        void handleSession(nextSession);
      });

    supabase.auth.getSession()
      .then(({ data: { session: initialSession } }) => {
        void handleSession(initialSession);
      })
      .catch((e) => {
        logger.error("getSession failed", e);
        if (active) {
          clearUserState();
          setLoading(false);
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [clearUserState, fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string, requestedRoles: string[]) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          requested_roles: requestedRoles.slice(0, 2),
        },
        emailRedirectTo: getAppUrl(),
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    lastSessionKeyRef.current = null;
    clearUserState();
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
