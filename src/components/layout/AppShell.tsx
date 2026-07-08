import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LayoutDashboard, Dumbbell, Calculator, Apple, CalendarDays, MessageCircle, Watch, Sparkles, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { to: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { to: "/training", label: "Тренировки", icon: Dumbbell },
  { to: "/calculators", label: "Калькуляторы", icon: Calculator },
  { to: "/nutrition", label: "Питание", icon: Apple },
  { to: "/events", label: "События", icon: CalendarDays },
  { to: "/coach", label: "AI Тренер", icon: MessageCircle },
  { to: "/devices", label: "Устройства", icon: Watch },
];

export function AppShell() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const role = useQuery(api.analytics.getRole);
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/auth");
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full transition-all duration-300",
          "bg-[#07070d] border-r border-white/[0.05] flex flex-col",
          collapsed ? "w-[72px]" : "w-[240px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center h-16 px-4", collapsed ? "justify-center" : "gap-3")}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {!collapsed && <span className="font-semibold text-sm tracking-tight">AI Coach</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {[...navItems, ...(role === "admin" ? [{ to: "/analytics", label: "Аналитика", icon: BarChart3 }] : [])].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  collapsed ? "justify-center px-2" : "",
                  isActive
                    ? "bg-purple-500/10 text-purple-300"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className={cn("border-t border-white/[0.04] p-3", collapsed ? "flex justify-center" : "")}>
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 truncate max-w-[140px]">{user?.email ?? "Спортсмен"}</span>
              <ThemeToggle />
            </div>
          ) : <ThemeToggle />}
        </div>
      </aside>

      {/* Main content */}
      <main className={cn("flex-1 transition-all duration-300 min-h-screen", collapsed ? "lg:ml-[72px]" : "lg:ml-[240px]")}>
        {/* Mobile header */}
        <header className="sticky top-0 z-30 lg:hidden flex items-center h-14 px-4 bg-background/80 backdrop-blur-xl border-b border-white/[0.04]">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="h-9 w-9">
            <Sparkles className="h-4 w-4" />
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
