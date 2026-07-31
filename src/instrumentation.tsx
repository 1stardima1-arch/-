import React from "react";

type ErrorBoundaryState = {
  hasError: boolean;
};

// Catches render errors so a crash shows a plain retry message instead of a
// blank screen or a raw stack trace. No dev tooling, no external reporting.
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">Что-то пошло не так</p>
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
