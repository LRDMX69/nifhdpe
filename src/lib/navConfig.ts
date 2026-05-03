import {
  LayoutDashboard, FileText, Users, Package, FolderKanban, BarChart3, Calculator,
  Truck, Settings, ClipboardList, DollarSign, Wrench, ShieldCheck, BookOpen, Target, UserCog, AlertCircle, MessageSquare, ShoppingCart,
} from "lucide-react";

export interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  roles: string[];
}

export const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", roles: ["administrator", "engineer", "technician", "warehouse", "finance", "hr", "reception_sales"] },

  // Admin executive pages only
  { label: "Field Reports", icon: ClipboardList, path: "/field-reports", roles: ["administrator", "engineer", "technician"] },
  { label: "Finance", icon: DollarSign, path: "/finance", roles: ["administrator", "finance"] },
  { label: "Opportunities", icon: Target, path: "/opportunities", roles: ["administrator", "reception_sales"] },
  { label: "Claims", icon: AlertCircle, path: "/claims", roles: ["administrator", "engineer", "technician", "warehouse", "finance", "hr", "reception_sales"] },
  { label: "Messages", icon: MessageSquare, path: "/messages", roles: ["administrator", "engineer", "technician", "warehouse", "finance", "hr", "reception_sales"] },
  { label: "Procurement", icon: ShoppingCart, path: "/procurement", roles: ["administrator", "finance", "warehouse"] },
  { label: "HSE", icon: ShieldCheck, path: "/hse", roles: ["administrator", "engineer", "technician"] },

  // HR visible to ALL roles (for check-in/out) + HR/Admin for full stats
  { label: "HR", icon: UserCog, path: "/hr", roles: ["administrator", "engineer", "technician", "warehouse", "finance", "hr", "reception_sales"] },

  // Operational pages — administrators get full visibility (oversight) too
  { label: "Quotations", icon: FileText, path: "/quotations", roles: ["administrator", "reception_sales"] },
  { label: "Clients", icon: Users, path: "/clients", roles: ["administrator", "reception_sales"] },
  { label: "Inventory", icon: Package, path: "/inventory", roles: ["administrator", "warehouse"] },
  { label: "Projects", icon: FolderKanban, path: "/projects", roles: ["administrator", "engineer", "technician"] },
  { label: "Logistics", icon: Truck, path: "/logistics", roles: ["administrator", "warehouse"] },
  { label: "Equipment", icon: Wrench, path: "/equipment", roles: ["administrator", "engineer", "technician", "warehouse"] },
  { label: "Compliance", icon: ShieldCheck, path: "/compliance", roles: ["administrator", "engineer"] },
  { label: "Knowledge Base", icon: BookOpen, path: "/knowledge-base", roles: ["administrator", "engineer", "technician", "warehouse", "finance", "hr", "reception_sales"] },
  { label: "Analytics", icon: BarChart3, path: "/analytics", roles: ["administrator", "finance", "reception_sales"] },
  { label: "Calculator", icon: Calculator, path: "/calculator", roles: ["administrator", "engineer", "technician"] },

  // Settings (admin only)
  { label: "Settings", icon: Settings, path: "/settings", roles: ["administrator"] },
];

/**
 * If isMaintenance is true, return ALL nav items (secret admin sees everything).
 * Otherwise filter by role.
 */
export const getNavItemsForRole = (role: string | undefined, isMaintenance = false): NavItem[] => {
  if (isMaintenance) return navItems;
  if (!role) return [];
  return navItems.filter((item) => item.roles.includes(role));
};
