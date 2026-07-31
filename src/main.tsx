import { Toaster } from "@/components/ui/sonner";
import { InstrumentationProvider } from "@/instrumentation.tsx";
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

function App() {
  return (
    <StrictMode>
      <InstrumentationProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Suspense fallback={<RouteLoading />}>
            <Connect />
          </Suspense>
          <Toaster />
        </ThemeProvider>
      </InstrumentationProvider>
    </StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
