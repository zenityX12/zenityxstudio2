import { useLocation } from "wouter";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/SidebarContext";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface AppLayoutProps {
  children: React.ReactNode;
  currentTab?: string;
  onTabChange?: (tab: string) => void;
}

export function AppLayout({ children, currentTab, onTabChange }: AppLayoutProps) {
  const [location] = useLocation();
  const { isCollapsed, toggleCollapsed } = useSidebar();
  const isMobile = useIsMobile();

  // Don't show sidebar on homepage or mobile
  const showSidebar = location !== "/" && !isMobile;

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {showSidebar && (
        <Sidebar
          isCollapsed={isCollapsed}
          onToggle={toggleCollapsed}
          currentTab={currentTab}
          onTabChange={onTabChange}
        />
      )}
      <main
        className={cn(
          "flex-1 transition-all duration-300",
          showSidebar ? (isCollapsed ? "pl-16" : "pl-64") : "pl-0"
        )}
      >
        {children}
      </main>
    </div>
  );
}

