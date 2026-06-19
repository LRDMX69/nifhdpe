import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { BottomNav } from "./BottomNav";
import { MFAEnforcer } from "../auth/MFAEnforcer";
import { RoleBasedOnboarding } from "./RoleBasedOnboarding";
import { CommandPalette } from "../CommandPalette";
import { HelpSheetProvider } from "../HelpSheetProvider";
import { GuidedTour } from "../GuidedTour";

export const AppLayout = () => {
  return (
    <MFAEnforcer>
      <HelpSheetProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <AppSidebar />
          </div>
          {/* Mobile top nav */}
          <MobileNav />
          <main className="flex-1 overflow-y-auto md:pt-0 pt-14 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
            <Outlet />
          </main>
          {/* Mobile bottom nav */}
          <BottomNav />
          <RoleBasedOnboarding />
          <CommandPalette />
          <GuidedTour />
        </div>
      </HelpSheetProvider>
    </MFAEnforcer>
  );
};
