import { Link, useLocation } from "react-router-dom";
import { LogOut, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, ROLE_LABELS } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import nifLogo from "@/assets/nif-logo.png";
import { getNavItemsForRole, GROUP_ORDER, type NavGroup, type NavItem } from "@/lib/navConfig";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const tooltipData: Record<string, string> = {
  "Dashboard": "Your starting point: see what needs attention today, open your role’s main tasks, and review key business signals.",
  "Field Reports": "Daily site reports: record work completed, attach evidence, and review installation progress.",
  "Finance": "Money and invoices: record receipts, review expenses, manage payments, and see what is still owed.",
  "Opportunities": "Sales leads: track possible projects, follow up with clients, and move opportunities toward quotations.",
  "Claims": "Incident & Hazard Claims: Log safety events, equipment damage, or hazard claims. Generates certified PDF claim sheets instantly.",
  "Messages": "Operations Real-Time Chat: Communicate instantly with project heads, field engineers, and departments. Autocreated when projects launch.",
  "Procurement": "Buying and purchase orders: request materials, compare vendors, and send purchases for approval.",
  "HSE": "HSE Compliance: Log on-site health and safety checks, monitor risk indices, and ensure strict compliance with construction regulations.",
  "HR": "People and attendance: review check-ins, leave, payroll, employee records, recruitment, and training.",
  "Quotations": "Client estimates: prepare itemized prices, terms, and documents for a client’s proposed work.",
  "Clients": "Client Directories: Manage primary contact registers, corporate pipeline accounts, and active contract profiles.",
  "Inventory": "Stock on hand: see pipe and fitting quantities, reserved materials, and low-stock items.",
  "Projects": "Installation Portfolio: Manage active project phases, check geofenced coordinates, assign crew leaders, and calculate budget margins.",
  "Logistics": "Deliveries and fleet: plan dispatches, assign drivers, track delivery status, and print waybills.",
  "Equipment": "Machinery Assets: Track operations schedules, usage logs, maintenance intervals, and operator allocations for all heavy site tools.",
  "Compliance": "Regulatory Frameworks: Track state environmental approvals, safety standards, and pipeline regulatory checklists.",
  "Analytics": "Performance Metrics: Review pipeline performance, delivery speeds, warehouse trends, and financial growth charts.",
  "Calculator": "Pipe sizing tool: compare pipe sizes and calculate flow, pressure, and head-loss values.",
  "Settings": "Workspace settings: manage organization details, user access, roles, and system preferences."
};

export const AppSidebar = () => {
  const location = useLocation();
  const { profile, memberships, activeRole, activeOrganizationId, signOut, isMaintenance, switchOrganization } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const visibleItems = getNavItemsForRole(activeRole ?? undefined, isMaintenance);

  const grouped = GROUP_ORDER
    .map((g) => ({ group: g, items: visibleItems.filter((i: NavItem) => (i.group ?? "Workspace") === g) }))
    .filter((g) => g.items.length > 0);

  useEffect(() => {
    if (!navRef.current) return;
    const links = navRef.current.querySelectorAll("a");
    gsap.fromTo(links, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.03, ease: "power2.out" });
  }, []);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border">
        <img src={nifLogo} alt="NIF Technical" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold text-sm truncate">{APP_NAME}</span>
            <span className="text-[10px] text-sidebar-foreground/50 truncate">Operations Suite</span>
          </div>
        )}
      </div>

      <TooltipProvider delayDuration={100}>
        <nav ref={navRef} className="flex-1 overflow-y-auto py-2 px-2 space-y-3">
          {grouped.map(({ group, items }) => (
            <div key={group} className="space-y-0.5">
              {!collapsed && (
                <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {group}
                </p>
              )}
              {collapsed && <div className="mx-2 my-1 border-t border-sidebar-border/40" />}
              {items.map((item: NavItem) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                return (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.path}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[240px] p-3 space-y-1.5 bg-popover border border-border shadow-xl rounded-lg text-popover-foreground">
                      <p className="font-semibold text-xs text-primary">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-normal">{tooltipData[item.label] ?? "Access operational features."}</p>
                      <div className="border-t border-border/50 pt-1 mt-1 text-[9px] text-primary/70 font-medium">
                        Role Access: {activeRole ? ROLE_LABELS[activeRole] : "Super Admin"}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </nav>
      </TooltipProvider>

      <div className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed && (
          <div className="px-1 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{profile?.full_name ?? "User"}</p>
              {memberships.length > 1 && (
                <button
                  onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                  className="text-sidebar-foreground/40 hover:text-sidebar-foreground"
                  title="Switch organization"
                >
                  <Building2 className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-sidebar-foreground/40 truncate">
              {activeRole ? ROLE_LABELS[activeRole] ?? activeRole : "No role"}
            </p>
            {showOrgSwitcher && memberships.length > 1 && (
              <div className="mt-2 space-y-1">
                {memberships.map((m) => (
                  <button
                    key={m.organization_id}
                    onClick={() => {
                      switchOrganization(m.organization_id);
                      setShowOrgSwitcher(false);
                    }}
                    className={cn(
                      "w-full text-left px-2 py-1 rounded text-xs transition-colors",
                      m.organization_id === activeOrganizationId
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    {m.organization_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <NotificationBell />
          <ThemeToggle collapsed={collapsed} />
          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent ml-auto h-8 text-xs"
              onClick={signOut}
            >
              <LogOut className="h-3 w-3 mr-1" />
              Sign Out
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
};
