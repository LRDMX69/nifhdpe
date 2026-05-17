import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import AdminDashboard from "./AdminDashboard";
import TechnicianDashboard from "./TechnicianDashboard";
import EngineerDashboard from "./EngineerDashboard";
import WarehouseDashboard from "./WarehouseDashboard";
import FinanceDashboard from "./FinanceDashboard";
import HRDashboard from "./HRDashboard";
import SalesDashboard from "./SalesDashboard";
import KnowledgeManagerDashboard from "./KnowledgeManagerDashboard";
import TraineeDashboard from "./TraineeDashboard";

const dashboardMap: Record<string, React.FC> = {
  administrator: AdminDashboard,
  engineer: EngineerDashboard,
  technician: TechnicianDashboard,
  warehouse: WarehouseDashboard,
  finance: FinanceDashboard,
  hr: HRDashboard,
  reception_sales: SalesDashboard,
  knowledge_manager: KnowledgeManagerDashboard,
  siwes_trainee: TraineeDashboard,
  it_student: TraineeDashboard,
  nysc_member: TraineeDashboard,
};

const DashboardRouter = () => {
  const { memberships, activeRole, switchRole, profile, isMaintenance } = useAuth();

  // Prioritize activeRole. If not selected, fallback to AdminDashboard for maintenance
  const DashboardComponent = activeRole 
    ? dashboardMap[activeRole] 
    : (isMaintenance ? AdminDashboard : null);

  const showSwitcher = memberships.length > 1 || isMaintenance;
  const rolesList = isMaintenance
    ? ["administrator", "engineer", "technician", "warehouse", "finance", "hr", "reception_sales"]
    : memberships.map((m) => m.role);

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
