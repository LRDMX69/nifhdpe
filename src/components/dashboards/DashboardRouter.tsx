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

  // Maintenance admin always sees AdminDashboard
  const DashboardComponent = isMaintenance
    ? AdminDashboard
    : activeRole ? dashboardMap[activeRole] : null;

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Role switcher for multi-role users */}
      {memberships.length > 1 && !isMaintenance && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pb-2">
          <span className="text-xs sm:text-sm text-muted-foreground">Switch Role:</span>
          <div className="flex flex-wrap gap-1.5">
            {memberships.map((m) => (
              <Button
                key={m.role}
                variant={activeRole === m.role ? "default" : "outline"}
                size="sm"
                onClick={() => switchRole(m.role)}
                className="h-7 px-3 text-[10px] sm:text-xs"
              >
                {ROLE_LABELS[m.role] ?? m.role}
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
