import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { WorkflowBanner } from "@/components/ui/workflow-banner";
import AdminDashboard from "./AdminDashboard";
import TechnicianDashboard from "./TechnicianDashboard";
import EngineerDashboard from "./EngineerDashboard";
import WarehouseDashboard from "./WarehouseDashboard";
import FinanceDashboard from "./FinanceDashboard";
import HRDashboard from "./HRDashboard";
import SalesDashboard from "./SalesDashboard";

const dashboardMap: Record<string, React.FC> = {
  administrator: AdminDashboard,
  // Technical Dept. (legacy enum aliases)
  engineer: EngineerDashboard,
  technician: TechnicianDashboard,
  // Logistics
  warehouse: WarehouseDashboard,
  // Accounts
  finance: FinanceDashboard,
  // HR
  hr: HRDashboard,
  // Marketing
  reception_sales: SalesDashboard,
};

const ROLE_RESPONSIBILITIES: Record<string, { summary: string; steps: { actor: string; action: string }[] }> = {
  administrator: {
    summary: "You're the system owner. Approve pending users, monitor AI alerts, and keep an eye on financials, projects and HR signals from one place.",
    steps: [
      { actor: "Today", action: "review pending role requests, AI anomaly flags and overdue invoices." },
      { actor: "This week", action: "check project risk heatmap, payroll status and inventory low-stock alerts." },
      { actor: "Always", action: "no hidden actions — every approval you make is logged in the audit trail." },
    ],
  },
  hr: {
    summary: "You own the people lifecycle: attendance, leaves, payroll, ID cards, recruitment and training.",
    steps: [
      { actor: "Today", action: "approve leave requests, review attendance exceptions and check holiday settings." },
      { actor: "Weekly", action: "run payroll preview, issue ID cards for new hires, follow up on disciplinary cases." },
      { actor: "Quarterly", action: "schedule performance reviews and update the training roster." },
    ],
  },
  finance: {
    summary: "You control money in and money out: invoices, receipts, vendor payments, expenses and worker claims.",
    steps: [
      { actor: "Daily", action: "post receipts against open invoices and review AI-flagged expense anomalies." },
      { actor: "Weekly", action: "match GRNs to Purchase Orders before releasing vendor payments." },
      { actor: "Monthly", action: "close the accounting period, post payroll and reconcile project P&L." },
    ],
  },
  engineer: {
    summary: "You lead project execution: field reports, deliveries, HSE compliance and team coordination on site.",
    steps: [
      { actor: "Daily", action: "submit field notes — the AI structures them into formal reports for review." },
      { actor: "Per delivery", action: "verify on-site receipt within the 300m geofence to mark Delivered." },
      { actor: "Weekly", action: "raise material requisitions, review HSE incidents and update project progress." },
    ],
  },
  technician: {
    summary: "You're in the field: log attendance, capture site evidence, request equipment and submit daily notes.",
    steps: [
      { actor: "Each shift", action: "check in on arrival (after 5 PM check-out is enforced for the day)." },
      { actor: "During work", action: "capture site photos with GPS, request missing equipment and report HSE issues immediately." },
      { actor: "End of day", action: "submit your notes — the AI converts them into a structured report for the engineer." },
    ],
  },
  warehouse: {
    summary: "You control inventory and dispatch: receive goods, manage storage locations, and schedule deliveries.",
    steps: [
      { actor: "On goods arrival", action: "post a GRN against the matching PO — inventory updates automatically." },
      { actor: "Per delivery", action: "schedule the run, assign a driver, and ensure GPS confirms on-site delivery." },
      { actor: "Weekly", action: "audit low-stock items and raise restock requests to procurement." },
    ],
  },
  reception_sales: {
    summary: "You drive the revenue pipeline: clients, opportunities and quotations that become invoices.",
    steps: [
      { actor: "Daily", action: "qualify new AI-scanned opportunities and follow up with active clients." },
      { actor: "Per deal", action: "create the quotation, get it accepted, then hand it to Finance for invoicing." },
      { actor: "Weekly", action: "review pipeline conversion and update opportunity statuses." },
    ],
  },
};

const DashboardRouter = () => {
  const { memberships, activeRole, switchRole, profile, isMaintenance } = useAuth();

  // Prioritize activeRole. If not selected, fallback to AdminDashboard for maintenance
  const DashboardComponent = activeRole 
    ? dashboardMap[activeRole] 
    : (isMaintenance ? AdminDashboard : null);

  const showSwitcher = memberships.length > 1 || isMaintenance;
  const rolesList = isMaintenance
    ? ["administrator", "technician", "reception_sales", "warehouse", "finance", "hr"]
    : memberships.map((m) => m.role);

  const effectiveRole = activeRole ?? (isMaintenance ? "administrator" : undefined);
  const roleInfo = effectiveRole ? ROLE_RESPONSIBILITIES[effectiveRole] : undefined;

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Role switcher for multi-role users or maintenance/testing sessions */}
      {showSwitcher && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pb-2">
          <span className="text-xs sm:text-sm text-muted-foreground font-semibold">Operational Role Testing Switcher:</span>
          <div className="flex flex-wrap gap-1.5">
            {rolesList.map((r) => (
              <Button
                key={r}
                variant={activeRole === r || (!activeRole && r === "administrator" && isMaintenance) ? "default" : "outline"}
                size="sm"
                onClick={() => switchRole(r)}
                className="h-7 px-3 text-[10px] sm:text-xs"
              >
                {ROLE_LABELS[r] ?? r}
              </Button>
            ))}
          </div>
        </div>
      )}

      {roleInfo && (
        <WorkflowBanner
          storageKey={`dashboard-${effectiveRole}`}
          title="Your responsibilities"
          summary={roleInfo.summary}
          steps={roleInfo.steps}
        />
      )}

      {DashboardComponent ? (
        <DashboardComponent />
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">Welcome, {profile?.full_name?.split(" ")[0] ?? "User"}</p>
          <p className="text-sm mt-2">No role assigned yet. Please contact your administrator.</p>
        </div>
      )}
    </div>
  );
};

export default DashboardRouter;
