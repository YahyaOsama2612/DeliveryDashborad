import { Component } from "react";
import { Button } from "../ui/button";

class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Unhandled application error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
          <section
            role="alert"
            className="w-full max-w-lg space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm"
          >
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The page hit an unexpected error. Reload the application to try
              again.
            </p>
            <Button type="button" onClick={() => window.location.reload()}>
              Reload application
            </Button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
