import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { LogoDropdown } from "@/components/LogoDropdown";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  LayoutDashboard,
  Dumbbell,
  Calculator,
  Apple,
  CalendarDays,
  MessageCircle,
  Watch,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  {
    to: "/dashboard",
    label: "Дашборд",
    icon: LayoutDashboard,
  },
  {
    to: "/training",
    label: "Тренировки",
    icon: Dumbbell,
  },
  {
    to: "/calculators",
    label: "Калькуляторы",
    icon: Calculator,
  },
  {
    to: "/nutrition",
    label: "Питание",
    icon: Apple,
  },
  {
    to: "/events",
    label: "События",
    icon: CalendarDays,
  },
  {
    to: "/coach",
    label: "AI Тренер",
    icon: MessageCircle,
  },
  {
    to: "/devices",
    label: "Устройства",
    icon: Watch,
  },
];

const adminNavItem = {
  to: "/analytics",
  label: "Аналитика",
  icon: BarChart3,
};

export function AppShell() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const role = useQuery(api.analytics.getRole);
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full transition-all duration-300",
          "bg-sidebar border-r border-sidebar-border",
          "flex flex-col",
          collapsed ? "w-[68px]" : "w-[250px]",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar header */}
        <div
          className={cn(
            "flex items-center h-16 px-3 border-b border-sidebar-border",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold text-sm tracking-tight">
                AI Coach
              </span>
            </div>
          )}
          <LogoDropdown />
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex h-7 w-7"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {[...navItems, ...(role === "admin" ? [adminNavItem] : [])].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-primary/15 text-primary shadow-[0_0_12px_var(--accent-glow)]"
                    : "text-sidebar-foreground/70"
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar footer */}
        {!collapsed && (
          <div className="p-3 border-t border-sidebar-border">
            <div className="glass-subtle rounded-lg p-3 text-xs">
              <p className="text-muted-foreground truncate">
                {user?.email ?? user?.name ?? "Спортсмен"}
              </p>
              <div className="flex items-center justify-between mt-2">
                <ThemeToggle />
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="p-2 border-t border-sidebar-border flex justify-center">
            <ThemeToggle />
          </div>
        )}
      </aside>

      {/* Main content */}
      <main
        className={cn(
          "transition-all duration-300 min-h-screen",
          collapsed ? "lg:ml-[68px]" : "lg:ml-[250px]"
        )}
      >
        {/* Mobile header */}
        <header className="sticky top-0 z-30 lg:hidden flex items-center h-14 px-4 glass-subtle border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <span className="ml-3 font-semibold text-sm">AI Coach</span>
        </header>
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
