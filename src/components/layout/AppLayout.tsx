import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { BottomNav } from "./BottomNav";

export const AppLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      {/* Mobile top nav */}
      <MobileNav />
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14 pb-16 md:pb-0">
        <Outlet />
      </main>
      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
};
