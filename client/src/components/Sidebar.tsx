import { memo, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link, useLocation, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import { LogoImage } from "@/components/Logo";
import { 
  Image as ImageIcon, 
  Video, 
  LayoutGrid, 
  History, 
  User,
  PanelLeft,
  PanelLeftClose,
  Sun,
  Moon,
  CreditCard,
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopupModal } from "@/components/TopupModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  currentTab?: string;
  onTabChange?: (tab: string) => void;
}

function SidebarComponent({ isCollapsed, onToggle, currentTab, onTabChange }: SidebarProps) {
  const [location] = useLocation();
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const { data: user } = trpc.auth.me.useQuery();
  const isAuthenticated = !!user;
  const utils = trpc.useUtils();
  
  const redeemMutation = trpc.redeemInvite.useMutation({
    onSuccess: (data: { credits: number }) => {
      toast.success(`Redeemed! You received ${data.credits} credits`);
      setInviteCode("");
      setInviteDialogOpen(false);
      utils.credits.get.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
  
  const handleRedeemInvite = () => {
    if (!inviteCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }
    redeemMutation.mutate({ code: inviteCode });
  };

  useEffect(() => {
    // Save last visited menu
    if (location.startsWith("/studio") || location.startsWith("/gallery") || location.startsWith("/history")) {
      localStorage.setItem("lastVisitedMenu", location);
    }
  }, [location]);

  const menuItems = [
    {
      id: "image-generator",
      label: "Image Generator",
      icon: ImageIcon,
      tab: "image",
      path: "/studio?tab=image",
      active: currentTab === "image",
    },
    {
      id: "video-generator",
      label: "Video Generator",
      icon: Video,
      tab: "video",
      path: "/studio?tab=video",
      active: currentTab === "video",
    },
    {
      id: "gallery",
      label: "Gallery",
      icon: LayoutGrid,
      path: "/gallery",
      active: location === "/gallery",
    },
    {
      id: "history",
      label: "History",
      icon: History,
      path: "/history",
      active: location === "/history",
    },
  ];

  // Admin menu removed from sidebar - available in top navigation only

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 z-40 flex flex-col",
          "transition-all duration-300 ease-in-out overflow-x-hidden",
          isCollapsed ? "w-16" : "w-64"
        )}
        style={{
          willChange: "width",
        }}
      >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
        {!isCollapsed ? (
          <>
            <div className="flex items-center pointer-events-none">
              <LogoImage className="h-8 w-auto" />
            </div>
            
            {/* Menu Toggle Button - visible on the right when expanded */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-5 w-5" />
            </Button>
          </>
        ) : (
          /* Menu Toggle Button - replaces logo when collapsed */
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 w-full"
            aria-label="Expand sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => {
          // For items with tab property, use button with onClick
          if (item.tab && onTabChange) {
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.tab!)}
                className={cn(
                  "flex items-center gap-3 py-3 cursor-pointer w-full",
                  "transition-all duration-200",
                  item.active
                    ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                  isCollapsed ? "justify-center px-0" : "px-6"
                )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && (
                <span className="font-medium text-sm whitespace-nowrap overflow-hidden">
                  {item.label}
                </span>
              )}
            </button>
            );
          }
          
          // For regular items, use Link
          return (
            <Link key={item.id} href={item.path}>
              <button
                className={cn(
                  "flex items-center gap-3 py-3 cursor-pointer w-full",
                  "transition-all duration-200",
                  item.active
                    ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                  isCollapsed ? "justify-center px-0" : "px-6"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium text-sm whitespace-nowrap overflow-hidden">
                    {item.label}
                  </span>
                )}
              </button>
            </Link>
          );
        })}
      </nav>

      {/* Redeem Code and Theme Toggle Row */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
        <div className={`flex items-center ${
          isCollapsed ? "flex-col gap-2" : "gap-2"
        }`}>
          <Button
            variant="ghost"
            size={isCollapsed ? "icon" : "default"}
            onClick={() => {
              if (isAuthenticated) {
                setInviteDialogOpen(true);
              } else {
                alert("กรุณาเข้าสู่ระบบก่อนใช้ Redeem Code");
              }
            }}
            className={`transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 ${
              isCollapsed ? "w-full" : "flex-1 justify-start gap-3"
            }`}
          >
            <Gift className="h-5 w-5 shrink-0" />
            {!isCollapsed && (
              <span className="font-medium text-sm">Redeem Code</span>
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const html = document.documentElement;
              const isDark = html.classList.contains("dark");
              if (isDark) {
                html.classList.remove("dark");
                localStorage.setItem("theme", "light");
              } else {
                html.classList.add("dark");
                localStorage.setItem("theme", "dark");
              }
            }}
            className="transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>
      
      </aside>
      
      <TopupModal open={topupModalOpen} onOpenChange={setTopupModalOpen} />
      
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Code</DialogTitle>
            <DialogDescription>
              Enter your code to receive credits
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleRedeemInvite}
              disabled={redeemMutation.isPending}
            >
              {redeemMutation.isPending ? "Redeeming..." : "Redeem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Memoize to prevent unnecessary re-renders
export const Sidebar = memo(SidebarComponent);

