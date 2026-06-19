import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MFAEnrollment } from "./MFAEnrollment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

// Roles that must have a verified TOTP factor before they can use the app.
// Maintenance admin and users without an active role (Pending screen) bypass.
const MFA_REQUIRED_ROLES = new Set(["administrator", "finance"]);

export const MFAEnforcer = ({ children }: { children: React.ReactNode }) => {
  const { activeRole, isMaintenance, isMfaEnabled, loading, refreshAccess, signOut } = useAuth();
  const [dismissed, setDismissed] = React.useState(false);

  if (loading) return <>{children}</>;
  if (isMaintenance) return <>{children}</>;
  if (!activeRole) return <>{children}</>;
  if (!MFA_REQUIRED_ROLES.has(activeRole)) return <>{children}</>;
  if (isMfaEnabled) return <>{children}</>;

  if (dismissed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-background">
        <Card className="max-w-md border-warning/40 bg-warning/5">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <ShieldAlert className="h-6 w-6 text-warning" />
            <CardTitle className="text-lg">MFA required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>The {activeRole} role requires Multi-Factor Authentication. Enroll a TOTP authenticator to continue.</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setDismissed(false)}>Enroll now</Button>
              <Button size="sm" variant="outline" onClick={async () => { await signOut(); }}>Sign out</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-4">
        <MFAEnrollment onComplete={() => { void refreshAccess(); }} />
        <div className="text-center">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground underline"
            onClick={() => setDismissed(true)}
          >
            I'll do this later
          </button>
        </div>
      </div>
    </div>
  );
};
