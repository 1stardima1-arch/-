import React from "react";

type ErrorBoundaryState = {
  hasError: boolean;
  message?: string;
};

// Catches render errors so a crash shows a plain retry message instead of a
// blank screen or a raw stack trace. No dev tooling, no external reporting —
// just the error text itself, since this is a single-user utility app and
// hiding it only makes it impossible to diagnose what broke.
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="text-center space-y-3 max-w-sm">
            <p className="text-sm text-muted-foreground">Что-то пошло не так</p>
            {this.state.message && (
              <p className="text-xs font-mono text-muted-foreground/70 break-words">
                {this.state.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="text-sm underline text-foreground"
            >
              Перезагрузить
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function InstrumentationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
