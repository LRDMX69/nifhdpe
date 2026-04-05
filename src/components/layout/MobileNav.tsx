import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogOut, Sun, Moon, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { APP_NAME, ROLE_LABELS } from "@/lib/constants";
import nifLogo from "@/assets/nif-logo.png";
import { getNavItemsForRole } from "@/lib/navConfig";
import { useTheme } from "next-themes";
import { NotificationBell } from "./NotificationBell";
import { getBottomNavPaths } from "./BottomNav";

export const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const location = useLocation();
  const { activeRole, signOut, profile, isMaintenance, memberships, activeOrganizationId, switchOrganization } = useAuth();
  const { theme, setTheme } = useTheme();

  const allItems = getNavItemsForRole(activeRole ?? undefined, isMaintenance);
  const role = isMaintenance ? "administrator" : (activeRole ?? "technician");
  const bottomPaths = getBottomNavPaths(role);
  // Sidebar shows only items NOT in bottom nav
  const visibleItems = allItems.filter(item => !bottomPaths.has(item.path));

  return (
    <>
      {/* Top bar */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 bg-sidebar text-sidebar-foreground border-b border-sidebar-border fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-2">
          <img src={nifLogo} alt="NIF Technical" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-bold text-sm">{APP_NAME}</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/60 h-9 w-9"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-sidebar-foreground h-9 w-9" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Full nav drawer for overflow items */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)}>
          <nav
            className="absolute top-14 left-0 right-0 bg-sidebar border-b border-sidebar-border max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-sidebar-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-sidebar-foreground">{profile?.full_name ?? "User"}</p>
                  <p className="text-xs text-sidebar-foreground/50">
                    {activeRole ? ROLE_LABELS[activeRole] ?? activeRole : "No role"}
                  </p>
                </div>
                {memberships.length > 1 && (
                  <button
                    onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                    className="text-sidebar-foreground/40 hover:text-sidebar-foreground"
                    title="Switch organization"
                  >
                    <Building2 className="h-4 w-4" />
                  </button>
                )}
              </div>
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
                        "w-full text-left px-2 py-1.5 rounded text-sm transition-colors",
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
            {visibleItems.length > 0 && (
              <div className="py-2 px-2 space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
            <div className="py-2 px-2 border-t border-sidebar-border">
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-destructive/70 hover:bg-sidebar-accent w-full text-left"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
};
