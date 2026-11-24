import { Component, useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  MapPin,
  Mail,
  Phone,
  Radio,
  RefreshCw,
  RotateCcw,
  Truck,
  User,
} from "lucide-react";
import useGet from "../../hooks/useGet";
import getErrorMessage from "../../lib/Geterrormessage";
import GenericDataTable from "../../components/shared/GenericDataTable";
import LiveTrackingMap from "../../components/shared/LiveTrackingMap";
import { Button } from "../../components/ui/button";
import useTrackingSocket from "../../hooks/useTrackingSocket";
import {
  getEntityCoordinates,
  parseCoordinates,
} from "../../lib/locationUtils";
import {
  extractDeliveryMen,
  getDeliveryManId,
} from "../../lib/deliveryManUtils";
import CreateDeliveryManDialog from "./CreateDeliveryManDialog";
import EditDeliveryManDialog from "./EditDeliveryManDialog";

const DELIVERY_MEN_URL = "/api/shipping/delivery-men";

const selectFilterClassName =
  "h-9 rounded-md border border-input bg-background px-2.5 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

// A marker with a bad coordinate (NaN, out of range) makes the map library throw
// and blanks the whole page, so only valid [lat, lng] pairs are passed to the map.
const isValidPosition = (position) =>
  Array.isArray(position) &&
  position.length === 2 &&
  Number.isFinite(Number(position[0])) &&
  Number.isFinite(Number(position[1])) &&
  Math.abs(Number(position[0])) <= 90 &&
  Math.abs(Number(position[1])) <= 180;

// If the live map ever crashes, show a small fallback instead of a blank page.
class MapErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("Live map crashed:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-48 flex-col items-center justify-center gap-2 p-5 text-center text-xs text-muted-foreground">
          <p className="text-sm font-medium text-foreground">
            The live map could not be displayed.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const getActiveOrderId = (order) =>
  typeof order === "object" && order !== null
    ? order.id || order._id || order.orderId
    : order;

const getActiveOrderCount = (driver) => {
  const reportedCount = Number(driver?.activeOrdersCount);
  const orderListCount = Array.isArray(driver?.activeOrders)
    ? driver.activeOrders.length
    : 0;
  return Math.max(
    Number.isFinite(reportedCount) ? reportedCount : 0,
    orderListCount,
  );
};

const Drivers = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [locationUpdates, setLocationUpdates] = useState({});
  const queryClient = useQueryClient();
  const { socket, status: socketStatus } = useTrackingSocket();

  // Filters matching GET /api/shipping/delivery-men query params
  const [filters, setFilters] = useState({
    search: "",
    shiftStatus: "",
    deliveryType: "",
    isOnline: "",
    isAvailable: "",
  });

  // Construct query params object for useGet
  const queryParams = useMemo(() => {
    const params = {};
    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.shiftStatus) params.shiftStatus = filters.shiftStatus;
    if (filters.deliveryType) params.deliveryType = filters.deliveryType;
    if (filters.isOnline) params.isOnline = filters.isOnline;
    if (filters.isAvailable) params.isAvailable = filters.isAvailable;
    return params;
  }, [filters]);

  const { data, loading, error, refetch } = useGet(
    DELIVERY_MEN_URL,
    queryParams,
  );

  const deliveryMen = useMemo(() => extractDeliveryMen(data), [data]);
  const {
    data: allDeliveryMenData,
    loading: allDeliveryMenLoading,
    error: allDeliveryMenError,
    refetch: refetchAllDeliveryMen,
  } = useGet(DELIVERY_MEN_URL);
  const allDeliveryMen = useMemo(
    () => extractDeliveryMen(allDeliveryMenData),
    [allDeliveryMenData],
  );

  const activeOrderAssignments = useMemo(() => {
    const assignments = new Map();
    allDeliveryMen.forEach((driver) => {
      const deliveryManId = getDeliveryManId(driver);
      if (!deliveryManId || !Array.isArray(driver.activeOrders)) return;
      driver.activeOrders.forEach((order) => {
        const orderId = getActiveOrderId(order);
        if (orderId) assignments.set(String(orderId), String(deliveryManId));
      });
    });
    return assignments;
  }, [allDeliveryMen]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleLocationChanged = (update) => {
      const location =
        update?.location ||
        update?.coordinates ||
        update?.currentLocation ||
        update;
      const id =
        update?.deliveryManId ||
        update?.delivery_man_id ||
        update?.courierId ||
        update?.courier_id ||
        update?.driverId ||
        update?.deliveryMan?.id ||
        update?.courier?.id ||
        activeOrderAssignments.get(
          String(update?.orderId ?? update?.order_id),
        );
      const position = parseCoordinates(
        location?.lat ?? location?.latitude ?? update?.currentLat,
        location?.lng ?? location?.longitude ?? update?.currentLng,
      );
      if (!id || !position) return;

      setLocationUpdates((current) => ({
        ...current,
        [String(id)]: {
          ...(current[String(id)] || {}),
          id,
          ...(update.deliveryManName ? { name: update.deliveryManName } : {}),
          ...(update.deliveryManPhone
            ? { phone: update.deliveryManPhone }
            : {}),
          currentLat: position[0],
          currentLng: position[1],
          ...(update.activeOrders ? { activeOrders: update.activeOrders } : {}),
          ...(update.activeOrdersCount != null
            ? { activeOrdersCount: update.activeOrdersCount }
            : {}),
          updatedAt: update.updatedAt || new Date().toISOString(),
        },
      }));
    };

    const refreshFleet = () => {
      queryClient.invalidateQueries({ queryKey: [DELIVERY_MEN_URL] });
    };

    const trackActiveOrders = () => {
      activeOrderAssignments.forEach((_, orderId) => {
        socket.emit("order:track", { orderId });
      });
    };
    const handleConnect = () => {
      setLocationUpdates({});
      refreshFleet();
      trackActiveOrders();
    };

    const refreshEvents = [
      "order:assigned",
      "order:courier_assigned",
      "order:status_changed",
      "order:manual_required",
      "order:picked_up",
      "order:delivered",
      "delivery:shift_changed",
      "courier:online",
      "courier:offline",
    ];

    socket.on("delivery:location_changed", handleLocationChanged);
    socket.on("order:courier_location", handleLocationChanged);
    refreshEvents.forEach((eventName) => socket.on(eventName, refreshFleet));
    socket.on("connect", handleConnect);
    if (socket.connected) trackActiveOrders();

    return () => {
      socket.off("delivery:location_changed", handleLocationChanged);
      socket.off("order:courier_location", handleLocationChanged);
      refreshEvents.forEach((eventName) =>
        socket.off(eventName, refreshFleet),
      );
      socket.off("connect", handleConnect);
      if (socket.connected) {
        activeOrderAssignments.forEach((_, orderId) => {
          socket.emit("order:untrack", { orderId });
        });
      }
    };
  }, [activeOrderAssignments, queryClient, socket]);

  const liveDeliveryMen = useMemo(() => {
    const driversById = new Map();
    allDeliveryMen.forEach((driver) => {
      const id = getDeliveryManId(driver);
      if (id) {
        driversById.set(String(id), {
          ...driver,
          ...(locationUpdates[String(id)] || {}),
        });
      }
    });
    Object.entries(locationUpdates).forEach(([id, update]) => {
      if (!driversById.has(id)) driversById.set(id, update);
    });
    return Array.from(driversById.values());
  }, [allDeliveryMen, locationUpdates]);

  const mapMarkers = useMemo(
    () =>
      liveDeliveryMen.flatMap((driver) => {
        const activeOrders = Array.isArray(driver.activeOrders)
          ? driver.activeOrders
          : [];
        const activeOrderCount = getActiveOrderCount(driver);
        if (!activeOrderCount) return [];

        const position = getEntityCoordinates(driver);
        const id = getDeliveryManId(driver);
        if (!position || !id || !isValidPosition(position)) return [];
        const dailyOrderNumbers = activeOrders
          .map((order) =>
            typeof order === "object" && order !== null
              ? order.dailyOrderNumber
              : null,
          )
          .filter((dailyOrderNumber) =>
            dailyOrderNumber != null && String(dailyOrderNumber).trim() !== "",
          )
          .map(String);
        const orderDetail = dailyOrderNumbers.length
          ? `Active orders: ${dailyOrderNumbers.join(", ")}`
          : `Active orders: ${activeOrderCount}`;
        return [
          {
            id: String(id),
            position,
            label: driver.name || "Delivery Man",
            detail: [driver.phone, orderDetail].filter(Boolean).join(" · "),
            color: "#f97316",
          },
        ];
      }),
    [liveDeliveryMen],
  );

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      shiftStatus: "",
      deliveryType: "",
      isOnline: "",
      isAvailable: "",
    });
  };

  const hasActiveFilters = Object.values(filters).some((val) => Boolean(val));

  const columns = useMemo(
    () => [
      {
        id: "driver",
        header: "Delivery Man",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-3 text-left">
              <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-muted shadow-xs">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name || "Driver"}
                    className="size-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <User className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">
                  {item.name || "Unnamed Driver"}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => {
          const phone = row.original.phone;
          if (!phone) return <span className="text-muted-foreground">—</span>;
          return (
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors"
            >
              <Phone className="size-3.5 text-muted-foreground" />
              <span dir="ltr">{phone}</span>
            </a>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => {
          const email = row.original.email;
          if (!email) return <span className="text-muted-foreground">—</span>;
          return (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="size-3.5" />
              <span>{email}</span>
            </a>
          );
        },
      },
      {
        accessorKey: "deliveryType",
        header: "Delivery Type",
        cell: ({ row }) => {
          const type = row.original.deliveryType || "outsource";
          return (
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-foreground dark:text-primary capitalize">
              <Truck className="size-3" />
              {type}
            </span>
          );
        },
      },
      {
        accessorKey: "shiftStatus",
        header: "Shift Status",
        cell: ({ row }) => {
          const status = row.original.shiftStatus || "inactive";
          const isActive = status === "active";
          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {status}
            </span>
          );
        },
      },

      {
        id: "availability",
        header: "Availability",
        cell: ({ row }) => {
          const isAvailable =
            row.original.isAvailable === true ||
            row.original.isAvailable === "true";
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isAvailable
                  ? "bg-teal-500/15 text-teal-700 dark:text-teal-400"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              }`}
            >
              <CheckCircle2
                className={`size-3 ${
                  isAvailable
                    ? "text-teal-600 dark:text-teal-400"
                    : "text-amber-600"
                }`}
              />
              {isAvailable ? "Available" : "Busy"}
            </span>
          );
        },
      },
    ],
    [],
  );

  return (
    <section className="space-y-6">
      {/* Header with Title */}
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold tracking-tight">Delivery Men</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Manage, register, and monitor delivery drivers.
        </p>
      </div>

      {/* Query Parameters Filter Bar */}
      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Filter className="size-3.5 text-primary" />
            <span>Filter Delivery Men</span>
          </div>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3" />
              <span>Reset Filters</span>
            </Button>
          )}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-4">
          {/* 1. shiftStatus */}
          <select
            value={filters.shiftStatus}
            onChange={(e) => handleFilterChange("shiftStatus", e.target.value)}
            className={selectFilterClassName}
            aria-label="Filter by shift status"
          >
            <option value="">All Shift Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* 2. deliveryType */}
          <select
            value={filters.deliveryType}
            onChange={(e) => handleFilterChange("deliveryType", e.target.value)}
            className={selectFilterClassName}
            aria-label="Filter by delivery type"
          >
            <option value="">All Delivery Types</option>
            <option value="outsource">Outsource</option>
            <option value="restaurant">Restaurant</option>
          </select>

          {/* 3. isOnline */}
          <select
            value={filters.isOnline}
            onChange={(e) => handleFilterChange("isOnline", e.target.value)}
            className={selectFilterClassName}
            aria-label="Filter by online status"
          >
            <option value="">All Online Statuses</option>
            <option value="true">Online</option>
            <option value="false">Offline</option>
          </select>

          {/* 4. isAvailable */}
          <select
            value={filters.isAvailable}
            onChange={(e) => handleFilterChange("isAvailable", e.target.value)}
            className={selectFilterClassName}
            aria-label="Filter by availability"
          >
            <option value="">All Availability</option>
            <option value="true">Available</option>
            <option value="false">Busy / Unavailable</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>
              Failed to load delivery men:{" "}
              {getErrorMessage(error, "Unknown error")}
              {error?.response?.status === 401 &&
                " (Your session may have expired. Please try logging in again)"}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-destructive/30 bg-background text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className="size-3.5 mr-1" />
            Retry
          </Button>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
        <div className="flex flex-col gap-2 border-b border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPin className="size-4 text-primary" />
              Live Fleet Map
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Heatmap shows active courier density and updates live.
            </p>
          </div>
          <div
            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              socketStatus === "connected"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : socketStatus === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            <Radio className="size-3.5" />
            {socketStatus === "connected"
              ? "Live"
              : socketStatus === "connecting"
                ? "Connecting"
                : socketStatus === "error"
                  ? "Connection failed"
                  : "Disconnected"}
          </div>
        </div>
        {allDeliveryMenError && (
          <div className="flex items-center justify-between gap-3 border-b border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive">
            <span>
              Failed to load courier locations:{" "}
              {getErrorMessage(allDeliveryMenError, "Unknown error")}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetchAllDeliveryMen()}
              className="h-7 shrink-0 gap-1.5 text-xs"
            >
              <RefreshCw className="size-3" />
              Retry
            </Button>
          </div>
        )}
        {mapMarkers.length ? (
          <div className="p-3">
            <MapErrorBoundary>
              <LiveTrackingMap
                markers={mapMarkers}
                heatmap
                className="h-[380px]"
              />
            </MapErrorBoundary>
            <div className="mt-2 flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
              <span>Lower density</span>
              <span
                aria-hidden="true"
                className="h-2.5 w-20 rounded-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-600"
              />
              <span>Higher density</span>
            </div>
          </div>
        ) : allDeliveryMenLoading ? (
          <div className="flex h-48 items-center justify-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="size-4 animate-spin" />
            Loading courier locations...
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center gap-2 p-5 text-center">
            <MapPin className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              No courier locations available
            </p>
            <p className="text-xs text-muted-foreground">
              Locations will appear when couriers share valid coordinates.
            </p>
          </div>
        )}
      </section>

      {/* Main Table */}
      <GenericDataTable
        title="Delivery Men"
        data={deliveryMen}
        columns={columns}
        isLoading={loading}
        queryKey={[DELIVERY_MEN_URL, queryParams]}
        sortByDate={false}
        actions={true}
        deleteApiUrl={DELIVERY_MEN_URL}
        onEdit={(row) => {
          setEditingDriver(row);
          setIsEditOpen(true);
        }}
        onAdd={() => setIsCreateOpen(true)}
      />

      {/* Dialog 1: Register New Delivery Man */}
      <CreateDeliveryManDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => refetch()}
      />

      {/* Dialog 2: Edit Delivery Man */}
      <EditDeliveryManDialog
        driverId={editingDriver?.id}
        initialDriver={editingDriver}
        open={isEditOpen}
        onOpenChange={(isOpen) => {
          setIsEditOpen(isOpen);
          if (!isOpen) setEditingDriver(null);
        }}
        onSuccess={() => refetch()}
      />
    </section>
  );
};

export default Drivers;
