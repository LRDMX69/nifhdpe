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
  terminated?: boolean | null;
}

interface UserMembership {
  organization_id: string;
  role: string;
  organization_name: string;
}

interface PendingRoleRequestRow {
  organization_id: string | null;
}

interface AccessSnapshot {
  profile: UserProfile | null;
  memberships: UserMembership[];
  activeRole: string | null;
  activeOrganizationId: string | null;
  isMaintenance: boolean;
  hasPendingRoleRequest: boolean;
  authError: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  memberships: UserMembership[];
  activeRole: string | null;
  activeOrganizationId: string | null;
  loading: boolean;
  accessResolved: boolean;
  hasPendingRoleRequest: boolean;
  isMaintenance: boolean;
  isMfaEnabled: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, requestedRoles: string[]) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshAccess: () => Promise<void>;
  switchRole: (role: string) => void;
  switchOrganization: (organizationId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EMPTY_ACCESS: AccessSnapshot = {
  profile: null,
  memberships: [],
  activeRole: null,
  activeOrganizationId: null,
  isMaintenance: false,
  hasPendingRoleRequest: false,
  authError: null,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessResolved, setAccessResolved] = useState(false);
  const [hasPendingRoleRequest, setHasPendingRoleRequest] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isMfaEnabled, setIsMfaEnabled] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const activeOrgRef = useRef<string | null>(null);
  const hydratedSessionKeyRef = useRef<string | null>(null);
  const initialSessionRestoredRef = useRef(false);
  const queuedInitialSessionRef = useRef<Session | null | undefined>(undefined);

  const applyAccessSnapshot = useCallback((snapshot: AccessSnapshot) => {
    setProfile(snapshot.profile);
    setMemberships(snapshot.memberships);
    setActiveRole(snapshot.activeRole);
    setActiveOrganizationId(snapshot.activeOrganizationId);
    activeOrgRef.current = snapshot.activeOrganizationId;
    setIsMaintenance(snapshot.isMaintenance);
    setHasPendingRoleRequest(snapshot.hasPendingRoleRequest);
    setAuthError(snapshot.authError);
    setAccessResolved(true);
  }, []);

  const clearUserState = useCallback(() => {
    applyAccessSnapshot(EMPTY_ACCESS);
    setSession(null);
    setUser(null);
    setIsMfaEnabled(false);
    activeOrgRef.current = null;
  }, [applyAccessSnapshot]);

  const fetchUserData = useCallback(async (userId: string): Promise<AccessSnapshot> => {
    try {
      const pendingRequestQuery = (supabase as any)
        .from("role_assignment_requests")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();

      const [maintenanceResult, profileResult, membershipResult, pendingRequestResult] = await Promise.all([
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
        pendingRequestQuery,
      ]);

      const { data: profileData, error: profileError } = profileResult;
      const { data: membershipData, error: membershipError } = membershipResult;
      const { data: pendingRequestData, error: pendingRequestError } = pendingRequestResult as {
        data: PendingRoleRequestRow | null;
        error: Error | null;
      };
      const isMaintenanceAdmin = !!maintenanceResult.data;

      if (profileError) {
        logger.error("Error fetching profile:", profileError);
      }
      if (membershipError) {
        logger.error("Error fetching memberships:", membershipError);
      }
      if (pendingRequestError) {
        logger.error("Error fetching role assignment requests:", pendingRequestError);
      }

      const mappedMemberships: UserMembership[] = (membershipData ?? []).map((membership) => ({
        organization_id: membership.organization_id,
        role: membership.role,
        organization_name: (membership.organizations as unknown as { name: string } | null)?.name ?? "",
      }));

      if (mappedMemberships.length > 0) {
        const preferredOrg = activeOrgRef.current && mappedMemberships.some((membership) => membership.organization_id === activeOrgRef.current)
          ? activeOrgRef.current
          : mappedMemberships[0].organization_id;

        const activeMembership = mappedMemberships.find((membership) => membership.organization_id === preferredOrg) ?? mappedMemberships[0];

        return {
          profile: (profileData as UserProfile | null) ?? null,
          memberships: mappedMemberships,
          activeRole: isMaintenanceAdmin ? "administrator" : activeMembership.role,
          activeOrganizationId: preferredOrg,
          isMaintenance: isMaintenanceAdmin,
          hasPendingRoleRequest: !!pendingRequestData,
          authError: profileError
            ? "We couldn't fully load your account profile."
            : null,
        };
      }

      if (isMaintenanceAdmin) {
        const orgId = (profileData as UserProfile | null)?.organization_id ?? activeOrgRef.current ?? null;

        return {
          profile: (profileData as UserProfile | null) ?? null,
          memberships: orgId
            ? [{ organization_id: orgId, role: "administrator", organization_name: "System" }]
            : [],
          activeRole: "administrator",
          activeOrganizationId: orgId,
          isMaintenance: true,
          hasPendingRoleRequest: false,
          authError: profileError
            ? "We couldn't fully load your account profile."
            : null,
        };
      }

      const combinedError = membershipError || profileError || pendingRequestError;

      return {
        profile: (profileData as UserProfile | null) ?? null,
        memberships: [],
        activeRole: null,
        activeOrganizationId: pendingRequestData?.organization_id ?? (profileData as UserProfile | null)?.organization_id ?? null,
        isMaintenance: false,
        hasPendingRoleRequest: !!pendingRequestData,
        authError: combinedError
          ? "We couldn't confirm your access permissions yet. Please retry."
          : null,
      };
    } catch (error) {
      logger.error("Error fetching user data/memberships:", error);
      return {
        ...EMPTY_ACCESS,
        authError: error instanceof Error ? error.message : "Failed to load account access.",
      };
    }
  }, []);

  const hydrateSession = useCallback(async (nextSession: Session | null, force = false) => {
    const sessionKey = nextSession?.access_token ?? nextSession?.user?.id ?? "signed-out";

    if (!force && hydratedSessionKeyRef.current === sessionKey) {
      setLoading(false);
      return;
    }

    hydratedSessionKeyRef.current = null;
    setLoading(true);
    setAccessResolved(false);
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      clearUserState();
      hydratedSessionKeyRef.current = sessionKey;
      setLoading(false);
      return;
    }

    try {
      let snapshot = await fetchUserData(nextSession.user.id);

      const looksSuspiciouslyEmpty = !snapshot.isMaintenance && !snapshot.activeRole && !snapshot.hasPendingRoleRequest && !snapshot.authError;
      if (looksSuspiciouslyEmpty) {
        await supabase.auth.getUser().catch((error) => {
          logger.error("getUser retry failed", error);
        });
        snapshot = await fetchUserData(nextSession.user.id);
      }

      applyAccessSnapshot(snapshot);

      try {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        setIsMfaEnabled(factors?.all.some((factor) => factor.status === "verified") ?? false);
      } catch (error) {
        logger.error("MFA listFactors failed", error);
      }

      hydratedSessionKeyRef.current = sessionKey;
    } catch (error) {
      logger.error("Error hydrating session:", error);
      applyAccessSnapshot({
        ...EMPTY_ACCESS,
        authError: error instanceof Error ? error.message : "Failed to hydrate session.",
      });
      hydratedSessionKeyRef.current = sessionKey;
    } finally {
      setLoading(false);
    }
  }, [applyAccessSnapshot, clearUserState, fetchUserData]);

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      logger.info(`Supabase Auth Event: ${event}`);
      if (!active) return;

      if (!initialSessionRestoredRef.current && event === "INITIAL_SESSION") {
        queuedInitialSessionRef.current = nextSession;
        return;
      }

      void hydrateSession(nextSession, event === "SIGNED_OUT");
    });

    supabase.auth.getSession()
      .then(({ data: { session: initialSession } }) => {
        if (!active) return;

        initialSessionRestoredRef.current = true;
        const restoredSession = queuedInitialSessionRef.current !== undefined
          ? queuedInitialSessionRef.current
          : initialSession;

        void hydrateSession(restoredSession ?? null, true);
      })
      .catch((error) => {
        logger.error("getSession failed", error);
        if (!active) return;
        initialSessionRestoredRef.current = true;
        clearUserState();
        setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [clearUserState, hydrateSession]);

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
    hydratedSessionKeyRef.current = null;
    initialSessionRestoredRef.current = false;
    queuedInitialSessionRef.current = undefined;
    clearUserState();
  };

  const refreshAccess = useCallback(async () => {
    await hydrateSession(session, true);
  }, [hydrateSession, session]);

  const switchRole = (role: string) => {
    const isLocalDev = window.location.hostname.includes("localhost");
    if (isMaintenance || isLocalDev || memberships.some((membership) => membership.role === role)) {
      setActiveRole(role);
    }
  };

  const switchOrganization = (organizationId: string) => {
    const membership = memberships.find((item) => item.organization_id === organizationId);
    if (!membership) return;

    activeOrgRef.current = organizationId;
    setActiveOrganizationId(organizationId);
    setActiveRole(membership.role);
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
        accessResolved,
        hasPendingRoleRequest,
        isMaintenance: isMaintenance || (user ? window.location.hostname.includes("localhost") : false),
        isMfaEnabled,
        authError,
        signIn,
        signUp,
        signOut,
        refreshAccess,
        switchRole,
        switchOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
