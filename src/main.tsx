import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).hideSplash?.();

const PolarCallback = lazy(() => import("./pages/PolarCallback.tsx"));
const AppShell = lazy(() => import("./components/layout/AppShell").then(m => ({ default: m.AppShell })));
const Connect = lazy(() => import("./pages/Connect.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const Training = lazy(() => import("./pages/Training.tsx"));
const Calculators = lazy(() => import("./pages/Calculators.tsx"));
const Nutrition = lazy(() => import("./pages/Nutrition.tsx"));
const Events = lazy(() => import("./pages/Events.tsx"));
const Coach = lazy(() => import("./pages/Coach.tsx"));
const Devices = lazy(() => import("./pages/Devices.tsx"));
const Analytics = lazy(() => import("./pages/Analytics.tsx"));

function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm text-muted-foreground animate-pulse">Загрузка...</span>
      </div>
    </div>
  );
}

const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL as string) || 'https://valiant-hippopotamus-723.convex.cloud';
const convex = new ConvexReactClient(CONVEX_URL);

function RouteSyncer() {
  const location = useLocation();
  const trackEvent = useMutation(api.analytics.trackEvent);
  const ensureAdmin = useMutation(api.analytics.ensureAdmin);
  useEffect(() => { window.parent.postMessage({ type: "iframe-route-change", path: location.pathname }, "*"); }, [location.pathname]);
  useEffect(() => { trackEvent({ event: "page_view", path: location.pathname }); ensureAdmin(); }, [location.pathname, trackEvent, ensureAdmin]);
  useEffect(() => {
    const handler = (e: MessageEvent) => { if (e.data?.type === "navigate") { if (e.data.direction === "back") window.history.back(); if (e.data.direction === "forward") window.history.forward(); } };
    window.addEventListener("message", handler); return () => window.removeEventListener("message", handler);
  }, []);
  return null;
}

function App() {
  return (
    <StrictMode>
      <InstrumentationProvider>
        <VlyToolbar />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ConvexAuthProvider client={convex}>
            <BrowserRouter>
              <RouteSyncer />
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  <Route path="/" element={<Connect />} />
                  <Route path="/auth" element={<AuthPage redirectAfterAuth="/" />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/oauth/polar/callback" element={<PolarCallback />} />
                  <Route element={<AppShell />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/training" element={<Training />} />
                    <Route path="/calculators" element={<Calculators />} />
                    <Route path="/nutrition" element={<Nutrition />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/coach" element={<Coach />} />
                    <Route path="/devices" element={<Devices />} />
                    <Route path="/analytics" element={<Analytics />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
            <Toaster />
          </ConvexAuthProvider>
        </ThemeProvider>
      </InstrumentationProvider>
    </StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
