import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import PendingApproval from "@/pages/PendingApproval";
import { navItems } from "@/lib/navConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, accessResolved, memberships, isMaintenance, activeRole, hasPendingRoleRequest, authError } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Maintenance admin always passes
  if (isMaintenance) return <>{children}</>;

  if (activeRole) {
    // Enforce per-route role gating using the canonical nav config so a
    // technician cannot URL-jump into /finance, /hr, /settings, etc.
    const path = location.pathname;
    const match = navItems.find((item) => item.path.split("?")[0] === path);
    if (match && !match.roles.includes(activeRole)) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <Card className="max-w-md border-destructive/30 bg-destructive/5">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              <CardTitle className="text-lg">Access restricted</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Your current role ({activeRole}) is not permitted to view this page.</p>
              <p>If you believe this is wrong, contact an administrator.</p>
            </CardContent>
          </Card>
        </div>
      );
    }
    return <>{children}</>;
  }

  if (!accessResolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Restoring your access...</div>
      </div>
    );
  }

  if (memberships.length === 0 && hasPendingRoleRequest && !authError) {
    return <PendingApproval />;
  }

  if (memberships.length === 0 && authError) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
