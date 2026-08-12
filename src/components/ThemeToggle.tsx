import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export const ThemeToggle = ({ collapsed = false }: { collapsed?: boolean }) => {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size={collapsed ? "icon" : "sm"}
      className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!collapsed && <span className="ml-1 text-xs">{theme === "dark" ? "Light" : "Dark"}</span>}
    </Button>
  );
};
