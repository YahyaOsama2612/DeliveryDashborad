import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import useGet from "../../hooks/useGet";
import GenericDataTable from "../../components/shared/GenericDataTable";
import { Button } from "../../components/ui/button";
import ZoneDetailsDialog from "./ZoneDetailsDialog";
import ZoneFormDialog from "./ZoneFormDialog";
import ZoneTableColumns from "./ZoneTableColumns";
import {
  getData,
  getErrorMessage,
  QUERY_KEY,
  withId,
  ZONES_URL,
} from "./zoneUtils";

const ZoneLoadingError = ({ error, onRetry }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
    <span>Failed to load zones: {getErrorMessage(error, "Unknown error")}</span>
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onRetry}
      className="shrink-0 border-destructive/30 bg-background text-destructive"
    >
      <RefreshCw className="size-3.5" />
      Retry
    </Button>
  </div>
);

const Zones = () => {
  const { data, loading, error, refetch } = useGet(ZONES_URL);
  const [formOpen, setFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);

  const zones = useMemo(() => {
    const rawList = getData(data);
    return Array.isArray(rawList) ? rawList.map(withId) : [];
  }, [data]);

  const columns = useMemo(
    () => ZoneTableColumns({ onShowDetails: setSelectedZoneId }),
    [],
  );

  const handleAdd = () => {
    setEditingZone(null);
    setFormOpen(true);
  };

  const handleEdit = (argument) => {
    const candidate = argument?.original ?? argument;
    const id =
      candidate && typeof candidate === "object" ? candidate.id : candidate;
    const zone =
      zones.find((item) => String(item.id) === String(id)) ??
      (candidate && typeof candidate === "object" ? candidate : null);

    if (!zone?.id) {
      console.error("Zone has no recognizable id field:", zone);
      toast.error(
        `Could not edit: zone has no id (fields: ${Object.keys(zone || {}).join(", ")}).`,
      );
      return;
    }
    setEditingZone(zone);
    setFormOpen(true);
  };

  return (
    <section className="space-y-5">
      {error && <ZoneLoadingError error={error} onRetry={refetch} />}

      <GenericDataTable
        title="Zones"
        data={zones}
        columns={columns}
        isLoading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        editApiUrl={ZONES_URL}
        deleteApiUrl={ZONES_URL}
        queryKey={QUERY_KEY}
        sortByDate={false}
      />

      {formOpen && (
        <ZoneFormDialog
          key={editingZone?.id ?? "new-zone"}
          zone={editingZone}
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingZone(null);
          }}
        />
      )}

      <ZoneDetailsDialog
        zoneId={selectedZoneId}
        open={selectedZoneId != null}
        onOpenChange={(open) => {
          if (!open) setSelectedZoneId(null);
        }}
      />
    </section>
  );
};

export default Zones;
