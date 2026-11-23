import { useEffect } from "react";
import { useRouteError } from "react-router-dom";
import { Button } from "../ui/button";
import getErrorMessage from "../../lib/Geterrormessage";

const RouteErrorFallback = () => {
  const error = useRouteError();

  useEffect(() => {
    console.error("Route rendering failed:", error);
  }, [error]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <section
        role="alert"
        className="w-full max-w-lg space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm"
      >
        <h1 className="text-lg font-semibold">This page could not be loaded</h1>
        <p className="text-sm text-muted-foreground">
          {getErrorMessage(error, "An unexpected page error occurred.")}
        </p>
        <Button type="button" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </section>
    </main>
  );
};

export default RouteErrorFallback;
