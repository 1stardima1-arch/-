import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  LayoutDashboard, Dumbbell, Calculator, Apple, CalendarDays,
  MessageCircle, Watch, Sparkles, BarChart3, ChevronLeft,
  ChevronRight, Menu, X, LogOut
} from "lucide-react";
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
  const { isLoading, isAuthenticated, signOut, user } = useAuth();
  const role = useQuery(api.analytics.getRole);
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/auth");
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030308]">
        <div className="w-6 h-6 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  const allItems = [...navItems, ...(role === "admin" ? [{ to: "/analytics", label: "Аналитика", icon: BarChart3 }] : [])];

  return (
    <div className="min-h-screen bg-[#030308] flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full flex flex-col transition-all duration-300",
        "bg-[#06060e] border-r border-white/[0.04]",
        collapsed ? "w-[68px]" : "w-[232px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo header */}
        <div className={cn("flex items-center h-16 px-4 border-b border-white/[0.04]", collapsed ? "justify-center" : "gap-3")}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm tracking-tight text-white/80">AI Coach</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex absolute -right-3 top-5 w-6 h-6 rounded-full bg-[#06060e] border border-white/[0.06] items-center justify-center text-white/20 hover:text-white/50 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {allItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                collapsed ? "justify-center px-2" : "",
                isActive
                  ? "bg-violet-500/10 text-violet-300"
                  : "text-white/25 hover:text-white/50 hover:bg-white/[0.02]"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className={cn("border-t border-white/[0.04] p-3", collapsed ? "flex flex-col items-center gap-3" : "space-y-2")}>
          {!collapsed ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/20 truncate max-w-[140px]">{user?.email ?? "Спортсмен"}</span>
                <ThemeToggle />
              </div>
              <button onClick={() => signOut()} className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs text-white/20 hover:text-rose-400 hover:bg-rose-500/5 transition-colors">
                <LogOut className="h-3.5 w-3.5" /> Выйти
              </button>
            </>
          ) : (
            <>
              <ThemeToggle />
              <button onClick={() => signOut()} className="text-white/20 hover:text-rose-400 transition-colors">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className={cn("flex-1 transition-all duration-300 min-h-screen", collapsed ? "lg:ml-[68px]" : "lg:ml-[232px]")}>
        {/* Mobile header */}
        <header className="sticky top-0 z-30 lg:hidden flex items-center justify-between h-14 px-4 bg-[#030308]/80 backdrop-blur-xl border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="h-9 w-9">
              <Menu className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-sm text-white/70">AI Coach</span>
          </div>
        </header>
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
