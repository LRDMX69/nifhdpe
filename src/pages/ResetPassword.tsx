import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isPasswordPwned } from "@/lib/hibp";
import nifLogo from "@/assets/nif-logo.png";
import { Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pwnedWarning, setPwnedWarning] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase parses the recovery hash on client init and fires either
    // PASSWORD_RECOVERY or SIGNED_IN/INITIAL_SESSION. Listen for the event
    // but also fall back to (a) the raw hash and (b) any existing session,
    // because by the time this component mounts the hash may already be cleared.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
      }
    });

    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setReady(true);
    }

    // Last-resort: if a session already exists (hash was parsed before mount),
    // the user is authenticated and updateUser() will work.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    // Stop "Verifying…" from spinning forever — if nothing arrives in 4s,
    // let the user try anyway; updateUser will surface a real error if the
    // link was invalid.
    const fallback = window.setTimeout(() => setReady(true), 4000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(fallback);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const isPwned = await isPasswordPwned(password);
      if (isPwned) {
        setPwnedWarning(true);
        toast({ 
          title: "Insecure Password", 
          description: "This password has been found in data breaches (HIBP). Please choose a stronger one.", 
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({ title: "Password reset successful", description: "Your password has been updated. Redirecting to login..." });
      await supabase.auth.signOut();
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The reset link may have expired. Please request a new one.";
      toast({
        title: "Error resetting password",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md text-center space-y-4">
          <img src={nifLogo} alt="NIF Technical" className="h-12 w-12 mx-auto rounded-lg object-contain" />
          <p className="text-sm text-muted-foreground">Verifying reset link...</p>
          <p className="text-xs text-muted-foreground">If this takes too long, your link may have expired.</p>
          <Button variant="outline" onClick={() => navigate("/login")}>Back to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-none lg:border lg:shadow-sm lg:border-border/50">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img src={nifLogo} alt="NIF Technical" className="h-10 w-10 rounded-lg object-contain" />
              <span className="font-bold text-lg">NIF Technical</span>
            </div>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPwnedWarning(false); }}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    disabled={loading}
                    className={`pr-10 ${pwnedWarning ? "border-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {pwnedWarning && <p className="text-xs text-destructive font-medium">⚠ This password is known to be compromised. Use a different one.</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating password..." : "Update Password"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button type="button" className="text-sm text-primary hover:underline" onClick={() => navigate("/login")}>Back to Sign In</button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;