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
import { lovable } from "@/integrations/lovable/index";
import gsap from "gsap";
import nifLogo from "@/assets/nif-logo.png";

const Login = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [adminCapReached, setAdminCapReached] = useState(false);
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

      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      } else {
        // Store selected roles in localStorage so we can assign after email verification
        localStorage.setItem("nif_pending_roles", JSON.stringify(selectedRoles));
        toast({
          title: "Account created",
          description: "Please check your email to verify your account. Your role(s) will be assigned by an administrator.",
        });
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
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
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
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
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={async () => {
                  const { error } = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if (error) toast({ title: "Google sign-in failed", description: String(error), variant: "destructive" });
                }}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Sign in with Google
              </Button>
              {!isSignUp && (
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
                    onClick={async () => {
                      if (!email) {
                        toast({ title: "Enter your email", description: "Type your email above, then click Forgot Password.", variant: "destructive" });
                        return;
                      }
                      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
                      if (error) {
                        toast({ title: "Error", description: error.message, variant: "destructive" });
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
