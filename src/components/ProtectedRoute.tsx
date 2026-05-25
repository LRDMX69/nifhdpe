import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import PendingApproval from "@/pages/PendingApproval";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, memberships, isMaintenance, activeRole } = useAuth();

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

  // Render as soon as we have an active role, even if memberships array hasn't hydrated yet
  if (activeRole) return <>{children}</>;

  // User has no role assigned → show waiting page
  if (memberships.length === 0) {
    return <PendingApproval />;
  }

  return <>{children}</>;
};
