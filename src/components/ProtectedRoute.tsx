import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import PendingApproval from "@/pages/PendingApproval";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, accessResolved, memberships, isMaintenance, activeRole, hasPendingRoleRequest, authError } = useAuth();

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

  if (activeRole) return <>{children}</>;

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
