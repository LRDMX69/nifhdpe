import {
  LayoutDashboard, FileText, Users, Package, FolderKanban, BarChart3, Calculator,
  Truck, Settings, ClipboardList, DollarSign, Wrench, ShieldCheck, BookOpen, Target, UserCog, AlertCircle, MessageSquare, ShoppingCart, Receipt,
} from "lucide-react";

export interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  roles: string[];
}

// Six canonical departments. Legacy enum aliases:
//   engineer / technician      → Technical Dept.
//   warehouse                  → Logistics
//   finance                    → Accounts
//   reception_sales            → Marketing
const TECHNICAL = ["engineer", "technician"];
const LOGISTICS = ["warehouse"];
const ACCOUNTS  = ["finance"];
const MARKETING = ["reception_sales"];
const HR_ROLE   = ["hr"];
const ADMIN     = ["administrator"];
const ALL_DEPTS = [...ADMIN, ...TECHNICAL, ...LOGISTICS, ...ACCOUNTS, ...MARKETING, ...HR_ROLE];

export const navItems: NavItem[] = [
  { label: "Dashboard",     icon: LayoutDashboard, path: "/dashboard",     roles: ALL_DEPTS },

  // Technical Dept.
  { label: "Projects",      icon: FolderKanban,    path: "/projects",      roles: [...ADMIN, ...TECHNICAL] },
  { label: "Equipment",     icon: Wrench,          path: "/equipment",     roles: [...ADMIN, ...TECHNICAL, ...LOGISTICS] },
  { label: "Field Reports", icon: ClipboardList,   path: "/field-reports", roles: [...ADMIN, ...TECHNICAL] },
  { label: "HSE",           icon: ShieldCheck,     path: "/hse",           roles: [...ADMIN, ...TECHNICAL] },
  { label: "Compliance",    icon: ShieldCheck,     path: "/compliance",    roles: [...ADMIN, ...TECHNICAL] },
  { label: "Calculator",    icon: Calculator,      path: "/calculator",    roles: [...ADMIN, ...TECHNICAL] },

  // Marketing
  { label: "Opportunities", icon: Target,          path: "/opportunities", roles: [...ADMIN, ...MARKETING] },
  { label: "Quotations",    icon: FileText,        path: "/quotations",    roles: [...ADMIN, ...MARKETING] },
  { label: "Clients",       icon: Users,           path: "/clients",       roles: [...ADMIN, ...MARKETING] },

  // Logistics
  { label: "Inventory",     icon: Package,         path: "/inventory",     roles: [...ADMIN, ...LOGISTICS] },
  { label: "Logistics",     icon: Truck,           path: "/logistics",     roles: [...ADMIN, ...LOGISTICS] },

  // Accounts
  { label: "Finance",       icon: DollarSign,      path: "/finance",       roles: [...ADMIN, ...ACCOUNTS] },
  { label: "Invoices",      icon: Receipt,         path: "/finance?tab=invoices", roles: [...ADMIN, ...ACCOUNTS, ...MARKETING] },
  { label: "Procurement",   icon: ShoppingCart,    path: "/procurement",   roles: [...ADMIN, ...ACCOUNTS, ...LOGISTICS] },
  { label: "Analytics",     icon: BarChart3,       path: "/analytics",     roles: [...ADMIN, ...ACCOUNTS, ...MARKETING] },

  // HR
  { label: "HR",            icon: UserCog,         path: "/hr",            roles: ALL_DEPTS },

  // Cross-department
  { label: "Claims",        icon: AlertCircle,     path: "/claims",        roles: ALL_DEPTS },
  { label: "Messages",      icon: MessageSquare,   path: "/messages",      roles: ALL_DEPTS },
  { label: "Knowledge Base",icon: BookOpen,        path: "/knowledge-base",roles: ADMIN },
  { label: "Documents",     icon: FileText,        path: "/documents",     roles: ALL_DEPTS },

  { label: "Settings",      icon: Settings,        path: "/settings",      roles: ADMIN },
];

export const getNavItemsForRole = (role: string | undefined, isMaintenance = false): NavItem[] => {
  if (role) return navItems.filter((item) => item.roles.includes(role));
  if (isMaintenance) return navItems;
  return [];
};
