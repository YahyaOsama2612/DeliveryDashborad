import { useMemo, useState } from "react";
import { MapPinned } from "lucide-react";
import { toast } from "sonner";
import usePost from "../../hooks/usePost";
import useUpdate from "../../hooks/useUpdate";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import ZoneMapPicker from "./ZoneMapPicker";
import {
  getErrorMessage,
  getInitialFormData,
  parseCoordinatePoints,
  QUERY_KEY,
  ZONES_URL,
} from "./zoneUtils";

const ZoneFormFields = ({ formData, onChange }) => (
  <div className="grid gap-4 sm:grid-cols-2">
    <div className="space-y-2">
      <Label htmlFor="zone-name">Name</Label>
      <Input
        id="zone-name"
        value={formData.name}
        onChange={(event) => onChange("name", event.target.value)}
        placeholder="Zone A"
        required
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="zone-name-ar">Arabic name</Label>
      <Input
        id="zone-name-ar"
        dir="rtl"
        value={formData.nameAr}
        onChange={(event) => onChange("nameAr", event.target.value)}
        placeholder="المنطقة أ"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="zone-radius">Coverage area radius (km)</Label>
      <Input
        id="zone-radius"
        type="number"
        min="0"
        step="any"
        value={formData.coverageAreaRadiusKm}
        onChange={(event) =>
          onChange("coverageAreaRadiusKm", event.target.value)
        }
        required
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="zone-delivery-fee">Delivery fee</Label>
      <Input
        id="zone-delivery-fee"
        type="number"
        min="0"
        step="any"
        value={formData.deliveryFee}
        onChange={(event) => onChange("deliveryFee", event.target.value)}
        required
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="zone-min-order">Minimum order amount</Label>
      <Input
        id="zone-min-order"
        type="number"
        min="0"
        step="any"
        value={formData.minOrderAmount}
        onChange={(event) => onChange("minOrderAmount", event.target.value)}
        required
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="zone-status">Status</Label>
      <select
        id="zone-status"
        value={formData.status}
        onChange={(event) => onChange("status", event.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  </div>
);

const validateForm = (formData, coordinatePoints) => {
  if (!formData.name.trim()) return "Zone name is required.";
  if (!formData.coordinates.trim()) return "Coordinates are required.";

  try {
    const coordinates = JSON.parse(formData.coordinates);
    if (!Array.isArray(coordinates)) {
      return "Coordinates must be a JSON array.";
    }
  } catch {
    return "Coordinates must be valid JSON.";
  }

  if (coordinatePoints.length < 3) {
    return "Add at least 3 boundary points on the map.";
  }

  const numericFields = [
    ["coverageAreaRadiusKm", "Coverage area radius"],
    ["deliveryFee", "Delivery fee"],
    ["minOrderAmount", "Minimum order amount"],
  ];
  for (const [field, label] of numericFields) {
    const value = Number(formData[field]);
    if (formData[field] === "" || !Number.isFinite(value) || value < 0) {
      return `${label} must be a non-negative number.`;
    }
  }
  return "";
};

const ZoneFormDialog = ({ zone, open, onOpenChange }) => {
  const [formData, setFormData] = useState(() => getInitialFormData(zone));
  const [formError, setFormError] = useState("");
  const createMutation = usePost(ZONES_URL, "post", QUERY_KEY);
  const updateMutation = useUpdate(ZONES_URL, QUERY_KEY);
  const isEditing = Boolean(zone?.id);
  const isPending = createMutation.isPending || updateMutation.isPending;
  const coordinatePoints = useMemo(
    () => parseCoordinatePoints(formData.coordinates),
    [formData.coordinates],
  );

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFormError("");
  };

  const handleCoordinateChange = (points) => {
    handleChange("coordinates", JSON.stringify(points));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateForm(formData, coordinatePoints);
    setFormError(validationError);
    if (validationError) return;

    const payload = {
      name: formData.name.trim(),
      nameAr: formData.nameAr.trim(),
      coordinates: coordinatePoints.map(([lat, lng]) => ({ lat, lng })),
      coverageAreaRadiusKm: Number(formData.coverageAreaRadiusKm),
      deliveryFee: Number(formData.deliveryFee),
      minOrderAmount: Number(formData.minOrderAmount),
      status: formData.status,
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: zone.id, payload });
        toast.success("Zone updated successfully.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Zone created successfully.");
      }
      onOpenChange(false);
    } catch (error) {
      const message = getErrorMessage(
        error,
        `Failed to ${isEditing ? "update" : "create"} zone.`,
      );
      setFormError(message);
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="border-b border-border/70 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <MapPinned className="size-5 text-primary" />
            {isEditing ? "Edit Zone" : "Add Zone"}
          </DialogTitle>
          <DialogDescription>
            Set the zone name, coverage, pricing, and boundary coordinates.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-4 overflow-y-auto py-3 pr-1"
        >
          <ZoneFormFields formData={formData} onChange={handleChange} />
          <ZoneMapPicker
            points={coordinatePoints}
            onChange={handleCoordinateChange}
          />
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving…"
                : isEditing
                  ? "Save Changes"
                  : "Create Zone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ZoneFormDialog;
