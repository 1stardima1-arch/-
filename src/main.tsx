import { Toaster } from "@/components/ui/sonner";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).hideSplash?.();

const Connect = lazy(() => import("./pages/Connect.tsx"));

function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL as string) || 'https://valiant-hippopotamus-723.convex.cloud';
const convex = new ConvexReactClient(CONVEX_URL);

function App() {
  return (
    <StrictMode>
      <InstrumentationProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ConvexAuthProvider client={convex}>
            <Suspense fallback={<RouteLoading />}>
              <Connect />
            </Suspense>
            <Toaster />
          </ConvexAuthProvider>
        </ThemeProvider>
      </InstrumentationProvider>
    </StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
