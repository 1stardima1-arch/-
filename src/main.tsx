import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StrictMode, useEffect, lazy, Suspense, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { Loader2, WifiOff, RefreshCw, ServerCrash } from "lucide-react";
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

// Convex URL — сначала пытаемся из env, иначе fallback
const CONVEX_URL =
  (import.meta.env.VITE_CONVEX_URL as string) ||
  'https://valiant-hippopotamus-723.convex.cloud';

const convex = new ConvexReactClient(CONVEX_URL);

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

/**
 * ConnectionGuard — проверяет соединение с Convex перед рендером приложения.
 * Показывает экран загрузки/ошибки, если сервер недоступен.
 */
function ConnectionGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const checkConnection = useCallback(async () => {
    setStatus('loading');
    setErrorMsg('');

    // Extract domain from CONVEX_URL
    const domain = CONVEX_URL.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const testUrl = `${CONVEX_URL.replace(/\/$/, '')}/api/health`;

    // Try multiple times with increasing delays
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(testUrl, {
          method: 'HEAD',
          signal: controller.signal,
          mode: 'no-cors',
        });

        clearTimeout(timeoutId);
        setStatus('connected');
        return;
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        
        if (attempt < 2) {
          // Wait before retrying
          await new Promise(r => setTimeout(r, 3000));
        } else {
          // All attempts failed
          if (err.includes('abort') || err.includes('AbortError') || err.includes('timeout')) {
            setErrorMsg('Сервер не отвечает. Возможно, он заблокирован в вашем регионе.');
          } else if (err.includes('Failed to fetch') || err.includes('NetworkError')) {
            setErrorMsg('Сервер недоступен. Проверьте интернет или попробуйте использовать VPN.');
          } else {
            setErrorMsg(`Ошибка соединения: ${err.slice(0, 100)}`);
          }
          setStatus('error');
        }
      }
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-3xl shadow-lg shadow-purple-500/30">
            🏃
          </div>
          <h2 className="text-lg font-semibold text-foreground">Подключение к серверу</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Пожалуйста, подождите...</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-red-500/30">
            <ServerCrash className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">Сервер недоступен</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {errorMsg}
            </p>
          </div>
          <div className="text-xs text-muted-foreground/60 space-y-1">
            <p>💡 Попробуйте:</p>
            <p>• Включить/выключить VPN</p>
            <p>• Перезагрузить приложение</p>
            <p>• Подключиться к другой сети Wi-Fi</p>
          </div>
          <button
            onClick={checkConnection}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Повторить попытку
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <StrictMode>
      <InstrumentationProvider>
        <VlyToolbar />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ConvexAuthProvider client={convex}>
            <ConnectionGuard>
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
            </ConnectionGuard>
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
