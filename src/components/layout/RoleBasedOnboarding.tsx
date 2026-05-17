import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/lib/constants";
import { Info, CheckCircle2 } from "lucide-react";

const roleGuides: Record<string, { title: string; steps: string[] }> = {
  administrator: {
    title: "Platform Administrator Guide",
    steps: [
      "Manage Organizations: Create and configure client workspaces.",
      "Assign Roles: Navigate to Settings to manage user access and permissions.",
      "Global Oversight: Monitor all projects, financials, and field reports.",
      "System Maintenance: Use your override access to troubleshoot tenant issues."
    ]
  },
  engineer: {
    title: "Engineering Workspace",
    steps: [
      "Pipe Calculator: Use the Hazen-Williams calculator to spec out HDPE vs PVC requirements.",
      "Project Planning: Track your installation sites, assign heads, and set GPS geofences.",
      "Field Reports: Review daily logs submitted by technicians.",
      "Quotations: Draft technical quotes for upcoming projects."
    ]
  },
  technician: {
    title: "Technician Field Guide",
    steps: [
      "Site Check-in: Use the Projects tab to check in at geofenced installation sites.",
      "Field Reports: Submit your daily progress and material usage from your mobile device.",
      "Inventory: Request tools and HDPE fittings from the warehouse.",
      "Safety Claims: Report any hazards directly via the Worker Claims module."
    ]
  },
  warehouse: {
    title: "Warehouse & Inventory Control",
    steps: [
      "Stock Management: Track HDPE pipes, fittings, and consumables.",
      "Equipment Tracking: Monitor heavy machinery checkout and maintenance schedules.",
      "Logistics: Plan dispatch routes and log delivery waybills."
    ]
  },
  finance: {
    title: "Finance & Accounting",
    steps: [
      "Executive Dashboard: Monitor live P&L for all ongoing projects.",
      "Invoicing: Generate and dispatch invoices from Quotations.",
      "Payroll: Run monthly payroll calculations based on technician field days.",
      "Procurement: Approve vendor purchase orders."
    ]
  },
  hr: {
    title: "Human Resources Portal",
    steps: [
      "Staff Directory: Manage employee records and emergency contacts.",
      "ID Generation: Print scannable QR code ID cards for site workers.",
      "Claims: Review and process worker compensation and health claims.",
      "HSE: Enforce Health, Safety, and Environment policies."
    ]
  }
};

export function RoleBasedOnboarding() {
  const { user, activeRole, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState<{ title: string; steps: string[] } | null>(null);

  useEffect(() => {
    if (!user || !activeRole) return;
    
    // Check if they've seen the onboarding for this specific role
    const storageKey = `onboarding_seen_${user.id}_${activeRole}`;
    const hasSeen = localStorage.getItem(storageKey);
    
    if (!hasSeen) {
      // Find the specific guide or fall back to a generic one
      const selectedGuide = roleGuides[activeRole] || {
        title: `Welcome to your ${ROLE_LABELS[activeRole] || activeRole} Dashboard`,
        steps: [
          "Navigate using the sidebar to find your modules.",
          "Check your Messages for project-specific chats.",
          "Update your profile settings in the top right menu."
        ]
      };
      setGuide(selectedGuide);
      setOpen(true);
    }
  }, [user, activeRole]);

  const handleDismiss = () => {
    if (user && activeRole) {
      localStorage.setItem(`onboarding_seen_${user.id}_${activeRole}`, "true");
    }
    setOpen(false);
  };

  if (!guide) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Info className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Hi {profile?.full_name?.split(" ")[0] || "there"}, {guide.title}
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Here are your primary responsibilities and tools in the NIF platform:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {guide.steps.map((step, index) => (
            <div key={index} className="flex items-start gap-3 bg-secondary/30 p-3 rounded-lg border border-border/50">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
        
        <DialogFooter className="sm:justify-center">
          <Button onClick={handleDismiss} className="w-full sm:w-auto min-w-[120px]">
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
