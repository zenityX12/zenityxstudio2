import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import Home from "./pages/Home";
import Studio from "./pages/Studio";
import Gallery from "./pages/Gallery";
import History from "./pages/History";

import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import TransactionHistory from "./pages/TransactionHistory";
import SystemSettings from "./pages/SystemSettings";
import PaymentCallback from "./pages/PaymentCallback";
import MobileProfile from "./pages/mobile/MobileProfile";
import MobileAdmin from "./pages/mobile/MobileAdmin";
import MobileRedeem from "./pages/mobile/MobileRedeem";
import MobileVerify from "./pages/mobile/MobileVerify";
import { AppLayout } from "./components/AppLayout";
import { useLocation } from "wouter";

function Router() {
  const [location] = useLocation();
  // Exclude mobile routes, home, payment callback, and 404 from sidebar layout
  const showSidebar = location !== "/" && 
                      location !== "/payment/callback" && 
                      location !== "/404" &&
                      !location.startsWith("/mobile/");

  if (!showSidebar) {
    return (
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/payment/callback"} component={PaymentCallback} />
        <Route path={"/mobile/profile"} component={MobileProfile} />
        <Route path={"/mobile/admin"} component={MobileAdmin} />
        <Route path={"/mobile/redeem"} component={MobileRedeem} />
        <Route path={"/mobile/verify"} component={MobileVerify} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <AppLayout>
      <Switch>
        <Route path={"/studio"} component={Studio} />
        <Route path={"/gallery"} component={Gallery} />
        <Route path={"/history"} component={History} />

        <Route path={"/transactions"} component={TransactionHistory} />
        <Route path={"/admin"} component={Admin} />
        <Route path={"/system-settings"} component={SystemSettings} />
        <Route path={"/profile"} component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SidebarProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </SidebarProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
