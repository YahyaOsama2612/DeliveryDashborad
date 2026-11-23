import { useState, useMemo } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  GitBranch,
  Loader2,
  Pencil,
  RefreshCw,
  Store,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import useGet from "../../hooks/useGet";
import useUpdate from "../../hooks/useUpdate";
import getErrorMessage from "../../lib/Geterrormessage";
import QueryErrorNotice from "../../components/shared/QueryErrorNotice";
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

const RESTAURANTS_URL = "/api/shipping/restaurants";
const DELIVERY_MEN_BASE_URL = "/api/shipping/delivery-men";

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const EditDeliveryManForm = ({ driverId, driver, onCancel, onSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState(() => ({
    name: driver?.name || "",
    phone: driver?.phone || "",
    email: driver?.email || "",
    password: "",
    image: driver?.image || "",
    deliveryType: driver?.deliveryType || "outsource",
    shiftStatus: driver?.shiftStatus || "inactive",
    restaurantId: driver?.restaurant?.id || driver?.restaurantId || "",
    branchId: driver?.branch?.id || driver?.branchId || "",
  }));
  const [formError, setFormError] = useState("");

  // Fetch restaurants
  const {
    data: restaurantsData,
    loading: loadingRestaurants,
    error: restaurantsError,
    refetch: refetchRestaurants,
  } = useGet(RESTAURANTS_URL, {});

  const restaurants = useMemo(() => {
    const rawList =
      restaurantsData?.data?.data ||
      (Array.isArray(restaurantsData?.data) ? restaurantsData?.data : []);
    return Array.isArray(rawList) ? rawList : [];
  }, [restaurantsData]);

  // Fetch branches if restaurantId is selected
  const branchesUrl = formData.restaurantId
    ? `${RESTAURANTS_URL}/${formData.restaurantId}/branches`
    : null;

  const {
    data: branchesData,
    loading: loadingBranches,
    error: branchesError,
    refetch: refetchBranches,
  } = useGet(branchesUrl || "", {}, Boolean(formData.restaurantId));

  const branches = useMemo(() => {
    const rawList =
      branchesData?.data?.data ||
      (Array.isArray(branchesData?.data) ? branchesData?.data : []);
    return Array.isArray(rawList) ? rawList : [];
  }, [branchesData]);

  const updateMutation = useUpdate(DELIVERY_MEN_BASE_URL, [
    DELIVERY_MEN_BASE_URL,
  ]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "restaurantId") {
        updated.branchId = "";
      }
      return updated;
    });
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (!formData.phone.trim()) {
      setFormError("Phone number is required.");
      return;
    }
    if (!formData.email.trim()) {
      setFormError("Email is required.");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      deliveryType: formData.deliveryType,
      shiftStatus: formData.shiftStatus,
    };

    if (formData.password.trim()) {
      payload.password = formData.password.trim();
    }
    if (formData.image.trim()) {
      payload.image = formData.image.trim();
    }
    if (formData.restaurantId) {
      payload.restaurantId = formData.restaurantId;
    }
    if (formData.branchId) {
      payload.branchId = formData.branchId;
    }

    try {
      await updateMutation.mutateAsync({
        id: driverId,
        payload,
      });

      toast.success("Delivery man updated successfully!");
      onSuccess?.();
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to update delivery man.");
      setFormError(msg);
      toast.error(msg);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-1 overflow-y-auto py-3 space-y-4 pr-1"
    >
      {/* Current Assignment / Status Badges */}
      <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-2 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Store className="size-3.5 text-primary" />
            <span className="font-semibold text-foreground">
              {driver?.restaurant?.name || "No restaurant assigned"}
              {driver?.restaurant?.nameAr
                ? ` (${driver.restaurant.nameAr})`
                : ""}
            </span>
            {driver?.branch?.name && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <GitBranch className="size-3" />
                {driver.branch.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                driver?.isOnline
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400"
              }`}
            >
              {driver?.isOnline ? (
                <Wifi className="size-2.5" />
              ) : (
                <WifiOff className="size-2.5" />
              )}
              {driver?.isOnline ? "Online" : "Offline"}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                driver?.isAvailable
                  ? "bg-teal-500/15 text-teal-700 dark:text-teal-400"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              }`}
            >
              <CheckCircle2 className="size-2.5" />
              {driver?.isAvailable ? "Available" : "Busy"}
            </span>
          </div>
        </div>

        {driver?.shippingCompany?.name && (
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] border-t border-border/50 pt-1.5">
            <Building2 className="size-3" />
            <span>Shipping: {driver.shippingCompany.name}</span>
          </div>
        )}
      </div>

      {formError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Restaurant & Branch selection */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="editRestaurantId" className="text-xs font-semibold">
            Restaurant
          </Label>
          <select
            id="editRestaurantId"
            value={formData.restaurantId}
            onChange={(e) => handleChange("restaurantId", e.target.value)}
            disabled={loadingRestaurants}
            className={selectClassName}
          >
            <option value="">Select Restaurant (Optional)</option>
            {restaurants.map((rest) => (
              <option key={rest.id} value={rest.id}>
                {rest.name} {rest.nameAr ? `(${rest.nameAr})` : ""}
              </option>
            ))}
          </select>
          {restaurantsError && (
            <QueryErrorNotice
              error={restaurantsError}
              onRetry={refetchRestaurants}
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="editBranchId" className="text-xs font-semibold">
            Branch
          </Label>
          <select
            id="editBranchId"
            value={formData.branchId}
            onChange={(e) => handleChange("branchId", e.target.value)}
            disabled={!formData.restaurantId || loadingBranches}
            className={selectClassName}
          >
            <option value="">
              {!formData.restaurantId
                ? "Select restaurant first"
                : loadingBranches
                  ? "Loading branches..."
                  : branches.length === 0
                    ? "No branches available"
                    : "Select Branch"}
            </option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} {b.nameAr ? `(${b.nameAr})` : ""}
              </option>
            ))}
          </select>
          {branchesError && (
            <QueryErrorNotice
              error={branchesError}
              onRetry={refetchBranches}
            />
          )}
        </div>
      </div>

      {/* Name & Phone */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="editName" className="text-xs font-semibold">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="editName"
            placeholder="e.g. Ahmed Ali"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="editPhone" className="text-xs font-semibold">
            Phone Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="editPhone"
            type="tel"
            placeholder="e.g. +201234567890"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            required
          />
        </div>
      </div>

      {/* Email & Password */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="editEmail" className="text-xs font-semibold">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="editEmail"
            type="email"
            placeholder="ahmed@example.com"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="editPassword" className="text-xs font-semibold">
            New Password (Optional)
          </Label>
          <div className="relative">
            <Input
              id="editPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Leave blank to keep existing password"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Delivery Type & Shift Status */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="editDeliveryType" className="text-xs font-semibold">
            Delivery Type
          </Label>
          <select
            id="editDeliveryType"
            value={formData.deliveryType}
            onChange={(e) => handleChange("deliveryType", e.target.value)}
            className={selectClassName}
          >
            <option value="outsource">Outsource</option>
            <option value="restaurant">Restaurant</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="editShiftStatus" className="text-xs font-semibold">
            Shift Status
          </Label>
          <select
            id="editShiftStatus"
            value={formData.shiftStatus}
            onChange={(e) => handleChange("shiftStatus", e.target.value)}
            className={selectClassName}
          >
            <option value="inactive">Inactive</option>
            <option value="active">Active</option>
          </select>
        </div>
      </div>

      {/* Profile Image URL */}
      <div className="space-y-1.5">
        <Label htmlFor="editImage" className="text-xs font-semibold">
          Profile Image URL
        </Label>
        <Input
          id="editImage"
          type="url"
          placeholder="https://example.com/images/ahmed.jpg"
          value={formData.image}
          onChange={(e) => handleChange("image", e.target.value)}
        />
      </div>

      <DialogFooter className="border-t border-border/70 pt-3 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={updateMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={updateMutation.isPending}
          className="gap-1.5"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Pencil className="size-4" />
              <span>Save Changes</span>
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
};

const EditDeliveryManDialog = ({
  driverId,
  initialDriver,
  open,
  onOpenChange,
  onSuccess,
}) => {
  // 1. GET by ID: /api/shipping/delivery-men/{id}
  const driverDetailUrl = driverId
    ? `${DELIVERY_MEN_BASE_URL}/${driverId}`
    : null;

  const {
    data: driverDetailData,
    loading: loadingDriver,
    error: driverError,
    refetch: refetchDriver,
  } = useGet(driverDetailUrl || "", {}, Boolean(driverId && open));

  // Extract from the exact GET BY ID response: data.data.data
  const resolvedDriver = useMemo(() => {
    return (
      driverDetailData?.data?.data ||
      driverDetailData?.data ||
      initialDriver ||
      null
    );
  }, [driverDetailData, initialDriver]);

  const hasDetailLoaded = Boolean(driverDetailData?.data?.data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="border-b border-border/70 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Pencil className="size-5 text-primary" />
            <span>Edit Delivery Man</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update credentials, contact information, delivery type, and branch.
          </DialogDescription>
        </DialogHeader>

        {loadingDriver && !hasDetailLoaded ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary mb-2" />
            <p className="text-sm font-medium">
              Loading delivery man details...
            </p>
          </div>
        ) : (
          <>
            {driverError && !resolvedDriver && (
              <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <span>Failed to fetch driver details.</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchDriver()}
                  className="h-6 px-2 text-xs"
                >
                  <RefreshCw className="size-3 mr-1" />
                  Retry
                </Button>
              </div>
            )}

            {resolvedDriver && (
              <EditDeliveryManForm
                key={`${driverId}-${hasDetailLoaded ? "loaded" : "initial"}`}
                driverId={driverId}
                driver={resolvedDriver}
                onCancel={() => onOpenChange(false)}
                onSuccess={() => {
                  onOpenChange(false);
                  onSuccess?.();
                }}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditDeliveryManDialog;
