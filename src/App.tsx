import { useState, useCallback } from "react";
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
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Quotations from "./pages/Quotations";
import Clients from "./pages/Clients";
import Inventory from "./pages/Inventory";
import Projects from "./pages/Projects";
import Logistics from "./pages/Logistics";
import Analytics from "./pages/Analytics";
import PipeCalculator from "./pages/PipeCalculator";
import AppSettings from "./pages/AppSettings";
import FieldReports from "./pages/FieldReports";
import Finance from "./pages/Finance";
import Equipment from "./pages/Equipment";
import Compliance from "./pages/Compliance";
import KnowledgeBase from "./pages/KnowledgeBase";
import Opportunities from "./pages/Opportunities";
import HR from "./pages/HR";
import WorkerClaims from "./pages/WorkerClaims";
import Messages from "./pages/Messages";
import Procurement from "./pages/Procurement";
import HSE from "./pages/HSE";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
            <InstallPrompt />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
