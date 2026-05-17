import { useState, useCallback, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { SplashScreen } from "@/components/SplashScreen";
import { InstallPrompt } from "@/components/InstallPrompt";
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Quotations = lazy(() => import("./pages/Quotations"));
const Clients = lazy(() => import("./pages/Clients"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Projects = lazy(() => import("./pages/Projects"));
const Logistics = lazy(() => import("./pages/Logistics"));
const Analytics = lazy(() => import("./pages/Analytics"));
const PipeCalculator = lazy(() => import("./pages/PipeCalculator"));
const AppSettings = lazy(() => import("./pages/AppSettings"));
const FieldReports = lazy(() => import("./pages/FieldReports"));
const Finance = lazy(() => import("./pages/Finance"));
const Equipment = lazy(() => import("./pages/Equipment"));
const Compliance = lazy(() => import("./pages/Compliance"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const Opportunities = lazy(() => import("./pages/Opportunities"));
const HR = lazy(() => import("./pages/HR"));
const WorkerClaims = lazy(() => import("./pages/WorkerClaims"));
const Messages = lazy(() => import("./pages/Messages"));
const Procurement = lazy(() => import("./pages/Procurement"));
const HSE = lazy(() => import("./pages/HSE"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/quotations" element={<Quotations />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/logistics" element={<Logistics />} />
                <Route path="/field-reports" element={<FieldReports />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/equipment" element={<Equipment />} />
                <Route path="/compliance" element={<Compliance />} />
                <Route path="/knowledge-base" element={<KnowledgeBase />} />
                <Route path="/opportunities" element={<Opportunities />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/hr" element={<HR />} />
                <Route path="/calculator" element={<PipeCalculator />} />
                <Route path="/claims" element={<WorkerClaims />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/procurement" element={<Procurement />} />
                <Route path="/hse" element={<HSE />} />
                <Route path="/settings" element={<AppSettings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            <InstallPrompt />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
