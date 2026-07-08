import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StrictMode, useEffect, lazy, Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Hide the splash screen once React mounts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).hideSplash?.();

// Polar OAuth callback handler
const PolarCallback = lazy(() => import("./pages/PolarCallback.tsx"));

// Layout
const AppShell = lazy(() => import("./components/layout/AppShell").then(m => ({ default: m.AppShell })));

// Pages
const Landing = lazy(() => import("./pages/Landing.tsx"));
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

// Convex URL — проверяем перед инициализацией
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string;
const isConvexConfigured = CONVEX_URL && CONVEX_URL.length > 0 && CONVEX_URL.startsWith('https://');

// Если URL нет — создаём fallback клиент, который не падает
const convex = isConvexConfigured
  ? new ConvexReactClient(CONVEX_URL)
  : null;

function RouteSyncer() {
  const location = useLocation();
  const trackEvent = useMutation(api.analytics.trackEvent);
  const ensureAdmin = useMutation(api.analytics.ensureAdmin);

  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  // Track page views and check admin status
  useEffect(() => {
    trackEvent({ event: "page_view", path: location.pathname });
    ensureAdmin();
  }, [location.pathname, trackEvent, ensureAdmin]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

function App() {
  const [error, setError] = useState<string | null>(null);

  // If no Convex URL configured
  if (!isConvexConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-6">
        <div className="max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg shadow-purple-500/30">
            🏃
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Добро пожаловать в AI Coach!</h1>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            Для работы приложения нужно подключение к серверу. 
            Проверьте интернет-соединение и перезапустите приложение.
          </p>
          {error && (
            <p className="text-red-400 text-xs mb-4 p-3 bg-red-950/50 rounded-lg">
              {error}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Перезапустить
          </button>
        </div>
      </div>
    );
  }

  if (!convex) {
    return null; // Never happens because of the check above, but keeps TS happy
  }

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
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<AuthPage redirectAfterAuth="/dashboard" />} />
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

function mountApp() {
  try {
    createRoot(document.getElementById("root")!).render(<App />);
  } catch (e) {
    console.error("Failed to mount app:", e);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).showSplashError?.(
      "Критическая ошибка при запуске: " +
      (e instanceof Error ? e.message : String(e))
    );
  }
}

mountApp();
