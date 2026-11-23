import { RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import getErrorMessage from "../../lib/Geterrormessage";

const QueryErrorNotice = ({ error, onRetry }) => (
  <div
    role="alert"
    className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
  >
    <span>{getErrorMessage(error, "Could not load this data.")}</span>
    {onRetry && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onRetry()}
        className="h-7 shrink-0 gap-1 border-destructive/30 bg-background text-destructive"
      >
        <RefreshCw className="size-3" />
        Retry
      </Button>
    )}
  </div>
);

export default QueryErrorNotice;
