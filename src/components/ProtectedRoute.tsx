import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import PendingApproval from "@/pages/PendingApproval";
import { navItems } from "@/lib/navConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, RefreshCw, LogOut } from "lucide-react";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, accessResolved, memberships, isMaintenance, activeRole, hasPendingRoleRequest, authError, signOut, refreshAccess } = useAuth();
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

  // Terminal failure: the access snapshot could not be resolved (e.g. the
  // token was rejected by PostgREST and the retry back-off was exhausted).
  // Rendering a bare redirect would loop forever on the login page because
  // the user is still signed in; instead give explicit Retry / Sign out
  // actions so there is always a way out. (Finding H-09.)
  if (memberships.length === 0 && authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full border-destructive/30 bg-destructive/5">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            <CardTitle className="text-lg">Couldn't confirm your access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{authError}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void refreshAccess()}>
                <RefreshCw className="h-4 w-4 mr-1" /> Try again
              </Button>
              <Button size="sm" variant="outline" onClick={() => void signOut()}>
                <LogOut className="h-4 w-4 mr-1" /> Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
