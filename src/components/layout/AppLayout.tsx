import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { BottomNav } from "./BottomNav";
import { RoleBasedOnboarding } from "./RoleBasedOnboarding";
import { CommandPalette } from "../CommandPalette";
import { HelpSheetProvider } from "../HelpSheetProvider";
import { GuidedTour } from "../GuidedTour";
import { FeedbackButton } from "../feedback/FeedbackButton";

export const AppLayout = () => {
  return (
    <HelpSheetProvider>
        <div className="flex h-[100dvh] min-h-0 min-w-0 w-full overflow-hidden bg-background">
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <AppSidebar />
          </div>
          {/* Mobile top nav */}
          <MobileNav />
          <main className="min-w-0 min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto md:pt-0 pt-14 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
            <Outlet />
          </main>
          {/* Mobile bottom nav */}
          <BottomNav />
          <RoleBasedOnboarding />
          <CommandPalette />
          <GuidedTour />
          <FeedbackButton />
        </div>
    </HelpSheetProvider>
  );
};
