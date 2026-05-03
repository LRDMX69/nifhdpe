import { useAuth } from "@/contexts/AuthContext";
import { MFAEnrollment } from "./MFAEnrollment";
import { PageHeader } from "../layout/PageHeader";

export const MFAEnforcer = ({ children }: { children: React.ReactNode }) => {
  const { activeRole, isMfaEnabled, isMaintenance } = useAuth();
  
  // Roles that REQUIRE MFA
  const sensitiveRoles = ["administrator", "finance"];
  const requiresMfa = sensitiveRoles.includes(activeRole || "") && !isMaintenance;

  if (requiresMfa && !isMfaEnabled) {
    return (
      <div className="p-4 md:p-8 min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md">
          <MFAEnrollment onComplete={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
