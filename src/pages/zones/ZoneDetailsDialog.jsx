import { MapPinned, RefreshCw } from "lucide-react";
import useGet from "../../hooks/useGet";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  getCoordinates,
  getData,
  getErrorMessage,
  toDisplayMessage,
  ZONES_URL,
} from "./zoneUtils";

const ZoneDetails = ({ zone }) => (
  <dl className="grid gap-4 py-4 sm:grid-cols-2">
    <div>
      <dt className="text-xs font-medium text-muted-foreground">Name</dt>
      <dd className="mt-1 font-semibold">{zone.name || "—"}</dd>
    </div>
    <div>
      <dt className="text-xs font-medium text-muted-foreground">Arabic name</dt>
      <dd className="mt-1" dir="rtl">
        {zone.nameAr || "—"}
      </dd>
    </div>
    <div>
      <dt className="text-xs font-medium text-muted-foreground">
        Coverage radius
      </dt>
      <dd className="mt-1">{zone.coverageAreaRadiusKm ?? "—"} km</dd>
    </div>
    <div>
      <dt className="text-xs font-medium text-muted-foreground">
        Delivery fee
      </dt>
      <dd className="mt-1">{zone.deliveryFee ?? "—"}</dd>
    </div>
    <div>
      <dt className="text-xs font-medium text-muted-foreground">
        Minimum order amount
      </dt>
      <dd className="mt-1">{zone.minOrderAmount ?? "—"}</dd>
    </div>
    <div>
      <dt className="text-xs font-medium text-muted-foreground">Status</dt>
      <dd className="mt-1 capitalize">
        {toDisplayMessage(
          zone.status === true ? "active" : zone.status,
          "inactive",
        )}
      </dd>
    </div>
    <div className="sm:col-span-2">
      <dt className="text-xs font-medium text-muted-foreground">Coordinates</dt>
      <dd className="mt-1 whitespace-pre-wrap break-all rounded-lg bg-muted/50 p-3 font-mono text-xs">
        {getCoordinates(zone.coordinates) || "—"}
      </dd>
    </div>
  </dl>
);

const ZoneDetailsDialog = ({ zoneId, open, onOpenChange }) => {
  const url = zoneId ? `${ZONES_URL}/${zoneId}` : "";
  const { data, loading, error, refetch } = useGet(
    url,
    {},
    Boolean(open && zoneId),
  );
  const zone = getData(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b border-border/70 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <MapPinned className="size-5 text-primary" />
            Zone details
          </DialogTitle>
          <DialogDescription>
            Details loaded for zone ID {zoneId}.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <RefreshCw className="size-4 animate-spin" />
            Loading zone…
          </div>
        )}
        {error && !loading && (
          <div className="space-y-3 py-4">
            <p role="alert" className="text-sm text-destructive">
              {getErrorMessage(error, "Failed to load zone details.")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
            >
              <RefreshCw className="size-3.5" />
              Retry
            </Button>
          </div>
        )}
        {!loading && !error && zone && <ZoneDetails zone={zone} />}
      </DialogContent>
    </Dialog>
  );
};

export default ZoneDetailsDialog;
