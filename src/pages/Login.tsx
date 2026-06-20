import { useState, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { APP_FULL_NAME, ROLE_LABELS, ALL_ROLES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getAppUrl } from "@/lib/appUrl";
import gsap from "gsap";
import nifLogo from "@/assets/nif-logo.png";
import { humanizeError } from "@/lib/humanizeError";
import { Eye, EyeOff } from "lucide-react";

const Login = () => {
  const { user, loading, signIn, signUp, authError } = useAuth();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const leftRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (leftRef.current) {
      gsap.fromTo(leftRef.current, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.8, ease: "power3.out" });
    }
    if (formRef.current) {
      gsap.fromTo(formRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.3, ease: "power3.out" });
    }
  }, []);

  // Surface terminated-account / access errors raised by AuthContext.
  const shownErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (authError && shownErrorRef.current !== authError) {
      shownErrorRef.current = authError;
      toast({ title: "Access denied", description: authError, variant: "destructive" });
    }
  }, [authError, toast]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary animate-pulse" />
          <p className="text-sidebar-foreground/60 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) return prev.filter((r) => r !== role);
      if (prev.length >= 2) {
        toast({ title: "Maximum 2 roles", description: "You can select up to 2 roles.", variant: "destructive" });
        return prev;
      }
      return [...prev, role];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isSignUp) {
      if (selectedRoles.length === 0) {
        toast({ title: "Select a role", description: "Please select at least 1 role.", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      const { error } = await signUp(email, password, fullName, selectedRoles);
      if (error) {
        toast({ title: "Sign up failed", description: humanizeError(error), variant: "destructive" });
      } else {
        toast({
          title: "Account created",
          description: "You're signed in. An administrator will review your role request — you'll land on the Pending Approval screen until then.",
        });
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        let msg = error.message;
        if (msg.includes("Invalid login")) msg = "Invalid email or password. Please try again.";
        if (msg.includes("Email not confirmed")) msg = "Your account isn't confirmed yet. Use 'Forgot Password' to receive a reset link and get in.";
        toast({ title: "Sign in failed", description: msg, variant: "destructive" });
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div ref={leftRef} className="hidden lg:flex lg:w-1/2 bg-sidebar text-sidebar-foreground flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 -left-10 w-96 h-96 rounded-full border-2 border-primary" />
          <div className="absolute bottom-20 right-10 w-64 h-64 rounded-full border border-primary" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full border border-primary/50" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <img src={nifLogo} alt="NIF Technical" className="h-12 w-12 rounded-xl object-contain" />
            <span className="text-2xl font-bold">NIF Technical</span>
          </div>
          <p className="text-sidebar-foreground/60 text-sm">Operations Suite</p>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold leading-tight">
            Manage your pipe<br />
            operations with<br />
            <span className="text-primary">precision.</span>
          </h2>
          <p className="text-sidebar-foreground/60 max-w-md">
            Quotations, inventory, projects, and analytics — all in one powerful platform built for HDPE & PVC pipe professionals.
          </p>
        </div>

        <p className="relative z-10 text-sidebar-foreground/40 text-xs">
          © 2026 NIF Technical. All rights reserved.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-4 sm:p-6 bg-background">
        <div ref={formRef} className="w-full max-w-md">
          <Card className="border-0 shadow-none lg:border lg:shadow-sm lg:border-border/50">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4 lg:hidden">
                <img src={nifLogo} alt="NIF Technical" className="h-10 w-10 rounded-lg object-contain" />
                <span className="font-bold text-lg">{APP_FULL_NAME}</span>
              </div>
              <CardTitle className="text-2xl">{isSignUp ? "Create Account" : "Welcome Back"}</CardTitle>
              <CardDescription>
                {isSignUp ? "Set up your account to get started" : "Sign in to your operations dashboard"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
                {isSignUp ? (
                  <>
                    <p className="font-medium text-foreground mb-1">What happens next</p>
                    Your account is created and signed in immediately — no verification email needed. You'll land on
                    {" "}<span className="font-medium text-foreground">Pending Approval</span> until an administrator assigns your role.
                  </>
                ) : (
                  <>
                    <p className="font-medium text-foreground mb-1">Trouble signing in?</p>
                    If you've forgotten your password, click
                    {" "}<span className="font-medium text-foreground">Forgot Password</span> below to receive a reset link.
                    New accounts must be approved by an administrator before access is granted.
                  </>
                )}
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" required />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="pr-10"
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
                </div>

                {isSignUp && (
                  <div className="space-y-3">
                    <Label>Select Your Role(s) <span className="text-muted-foreground text-xs">(max 2)</span></Label>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_ROLES.map((role) => (
                        <label
                          key={role}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                            selectedRoles.includes(role)
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border hover:border-primary/40 text-muted-foreground"
                          }`}
                        >
                          <Checkbox
                            checked={selectedRoles.includes(role)}
                            onCheckedChange={() => toggleRole(role)}
                          />
                          <span className="truncate">{ROLE_LABELS[role]}</span>
                        </label>
                      ))}
                    </div>
                    {selectedRoles.includes("administrator") && (
                      <p className="text-xs text-warning">
                        ⚠ Administrator role is limited to 2 per organization. If slots are full, your request will be sent for approval.
                      </p>
                    )}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
                </Button>
              </form>
              {!isSignUp && (
                <div className="mt-3 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
                    onClick={async () => {
                      if (!email) {
                        toast({ title: "Enter your email", description: "Type your email above, then click Forgot Password.", variant: "destructive" });
                        return;
                      }
                      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${getAppUrl()}/reset-password` });
                      if (error) {
                        toast({ title: "Error", description: humanizeError(error), variant: "destructive" });
                      } else {
                        toast({ title: "Password reset email sent", description: "Check your inbox for a reset link." });
                      }
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
              <div className="mt-4 text-center">
                <button type="button" className="text-sm text-primary hover:underline" onClick={() => setIsSignUp(!isSignUp)}>
                  {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
