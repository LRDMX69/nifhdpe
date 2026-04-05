import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, ClipboardList, MessageSquare, FolderKanban,
  User, Target, DollarSign, Package, Wrench, UserCog, FileText,
} from "lucide-react";

interface BottomNavItem {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
}

const roleBottomNav: Record<string, BottomNavItem[]> = {
  administrator: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Reports", icon: ClipboardList, path: "/field-reports" },
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "Opportunities", icon: Target, path: "/opportunities" },
    { label: "Settings", icon: User, path: "/settings" },
  ],
  engineer: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Projects", icon: FolderKanban, path: "/projects" },
    { label: "Reports", icon: ClipboardList, path: "/field-reports" },
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "HR", icon: UserCog, path: "/hr" },
  ],
  technician: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Reports", icon: ClipboardList, path: "/field-reports" },
    { label: "Projects", icon: FolderKanban, path: "/projects" },
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "HR", icon: UserCog, path: "/hr" },
  ],
  warehouse: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Inventory", icon: Package, path: "/inventory" },
    { label: "Equipment", icon: Wrench, path: "/equipment" },
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "HR", icon: UserCog, path: "/hr" },
  ],
  finance: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Finance", icon: DollarSign, path: "/finance" },
    { label: "Claims", icon: FileText, path: "/claims" },
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "HR", icon: UserCog, path: "/hr" },
  ],
  hr: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "HR", icon: UserCog, path: "/hr" },
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "Claims", icon: FileText, path: "/claims" },
    { label: "Settings", icon: User, path: "/settings" },
  ],
  reception_sales: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Quotations", icon: FileText, path: "/quotations" },
    { label: "Clients", icon: User, path: "/clients" },
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "HR", icon: UserCog, path: "/hr" },
  ],
};

/** Returns the set of paths in the bottom nav for a given role — used by MobileNav to de-duplicate */
export const getBottomNavPaths = (role: string): Set<string> => {
  const items = roleBottomNav[role] ?? roleBottomNav.technician;
  return new Set(items.map(i => i.path));
};

export const BottomNav = () => {
  const location = useLocation();
  const { activeRole, isMaintenance } = useAuth();

  const role = isMaintenance ? "administrator" : (activeRole ?? "technician");
  const items = roleBottomNav[role] ?? roleBottomNav.technician;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                isActive
                  ? "text-primary"
                  : "text-sidebar-foreground/50"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
