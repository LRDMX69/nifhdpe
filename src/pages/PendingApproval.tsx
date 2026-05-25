import { useNavigate } from "react-router-dom";
import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import nifLogo from "@/assets/nif-logo.png";

const PendingApproval = () => {
  const { profile, authError, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <img src={nifLogo} alt="NIF Technical" className="h-16 w-16 mx-auto rounded-xl" />
        <div className="space-y-2">
          <div className="h-16 w-16 mx-auto rounded-full bg-warning/10 flex items-center justify-center">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <h1 className="text-2xl font-bold">Awaiting Role Assignment</h1>
          <p className="text-muted-foreground">
            Welcome, <span className="font-medium text-foreground">{profile?.full_name ?? "User"}</span>.
          </p>
          <p className="text-sm text-muted-foreground">
            Your account has been created but you haven't been assigned a role yet. 
            An administrator will review your account and assign the appropriate access level.
          </p>
        </div>
        {authError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-medium">Account loading issue</p>
            <p>{authError}</p>
          </div>
        )}
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p>Your access request is now stored in the ERP for administrator review, so it won’t get lost if you change device or sign in again.</p>
        </div>
        <Button variant="outline" onClick={handleSignOut} className="gap-2">
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
};

export default PendingApproval;
