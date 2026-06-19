import {
  LayoutDashboard, FileText, Users, Package, FolderKanban, BarChart3, Calculator,
  Truck, Settings, ClipboardList, DollarSign, Wrench, ShieldCheck, BookOpen, Target, UserCog, AlertCircle, MessageSquare, ShoppingCart, Receipt,
} from "lucide-react";

export interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  roles: string[];
  group?: NavGroup;
}

export type NavGroup =
  | "Overview"
  | "Technical"
  | "Marketing"
  | "Logistics"
  | "Accounts"
  | "People"
  | "Workspace";

export const GROUP_ORDER: NavGroup[] = [
  "Overview",
  "Technical",
  "Marketing",
  "Logistics",
  "Accounts",
  "People",
  "Workspace",
];

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
  { label: "Dashboard",     icon: LayoutDashboard, path: "/dashboard",     roles: ALL_DEPTS, group: "Overview" },

  // Technical Dept.
  { label: "Projects",      icon: FolderKanban,    path: "/projects",      roles: [...ADMIN, ...TECHNICAL], group: "Technical" },
  { label: "Equipment",     icon: Wrench,          path: "/equipment",     roles: [...ADMIN, ...TECHNICAL, ...LOGISTICS], group: "Technical" },
  { label: "Field Reports", icon: ClipboardList,   path: "/field-reports", roles: [...ADMIN, ...TECHNICAL], group: "Technical" },
  { label: "HSE",           icon: ShieldCheck,     path: "/hse",           roles: [...ADMIN, ...TECHNICAL], group: "Technical" },
  { label: "Compliance",    icon: ShieldCheck,     path: "/compliance",    roles: [...ADMIN, ...TECHNICAL], group: "Technical" },
  { label: "Calculator",    icon: Calculator,      path: "/calculator",    roles: [...ADMIN, ...TECHNICAL], group: "Technical" },

  // Marketing
  { label: "Opportunities", icon: Target,          path: "/opportunities", roles: [...ADMIN, ...MARKETING], group: "Marketing" },
  { label: "Quotations",    icon: FileText,        path: "/quotations",    roles: [...ADMIN, ...MARKETING], group: "Marketing" },
  { label: "Clients",       icon: Users,           path: "/clients",       roles: [...ADMIN, ...MARKETING], group: "Marketing" },

  // Logistics
  { label: "Inventory",     icon: Package,         path: "/inventory",     roles: [...ADMIN, ...LOGISTICS], group: "Logistics" },
  { label: "Logistics",     icon: Truck,           path: "/logistics",     roles: [...ADMIN, ...LOGISTICS], group: "Logistics" },

  // Accounts (also visible to HR for payroll & salary oversight)
  { label: "Finance",       icon: DollarSign,      path: "/finance",       roles: [...ADMIN, ...ACCOUNTS, ...HR_ROLE], group: "Accounts" },
  { label: "Invoices",      icon: Receipt,         path: "/finance?tab=invoices", roles: [...ADMIN, ...ACCOUNTS, ...MARKETING], group: "Accounts" },
  { label: "Procurement",   icon: ShoppingCart,    path: "/procurement",   roles: [...ADMIN, ...ACCOUNTS, ...LOGISTICS], group: "Accounts" },
  { label: "Analytics",     icon: BarChart3,       path: "/analytics",     roles: [...ADMIN, ...ACCOUNTS, ...MARKETING], group: "Accounts" },

  // HR
  { label: "HR",            icon: UserCog,         path: "/hr",            roles: ALL_DEPTS, group: "People" },

  // Cross-department
  { label: "Claims",        icon: AlertCircle,     path: "/claims",        roles: ALL_DEPTS, group: "People" },
  { label: "Messages",      icon: MessageSquare,   path: "/messages",      roles: ALL_DEPTS, group: "Workspace" },
  { label: "Knowledge Base",icon: BookOpen,        path: "/knowledge-base",roles: ADMIN, group: "Workspace" },
  { label: "Documents",     icon: FileText,        path: "/documents",     roles: ALL_DEPTS, group: "Workspace" },

  { label: "Settings",      icon: Settings,        path: "/settings",      roles: ADMIN, group: "Workspace" },
];

export const getNavItemsForRole = (role: string | undefined, isMaintenance = false): NavItem[] => {
  if (role) return navItems.filter((item) => item.roles.includes(role));
  if (isMaintenance) return navItems;
  return [];
};
