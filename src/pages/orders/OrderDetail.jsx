import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  CreditCard,
  Mail,
  MapPin,
  Package,
  Phone,
  Receipt,
  Radio,
  RefreshCw,
  ShoppingBag,
  Store,
  Truck,
  User,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import useGet from "../../hooks/useGet";
import getErrorMessage from "../../lib/Geterrormessage";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import LiveTrackingMap from "../../components/shared/LiveTrackingMap";
import { Separator } from "../../components/ui/separator";
import useTrackingSocket from "../../hooks/useTrackingSocket";
import {
  getEntityCoordinates,
  parseCoordinates,
} from "../../lib/locationUtils";
import AssignDeliveryManDialog from "./AssignDeliveryManDialog";
import {
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
  getOrderStatusInfo,
} from "./orderUtils";

/* -------------------------------------------------------------------------- */
/*  API response -> view model                                                */
/*  (internal ids are kept for sockets / dialogs but are never rendered)      */
/* -------------------------------------------------------------------------- */
const CURRENCY = "EGP";

const safeParse = (value, fallback) => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const humanize = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .trim();

// { success, data: { message, data: {order} } }  ->  {order}
const unwrapOrder = (payload) => {
  let current = payload;
  for (let i = 0; i < 5 && current && typeof current === "object"; i += 1) {
    if (current.dailyOrderNumber != null || Array.isArray(current.items)) return current;
    current = current.data ?? current.order;
  }
  return current && typeof current === "object" ? current : null;
};

const STATUS_ALIASES = {
  accepted: "confirmed",
  in_progress: "preparing",
  picked_up: "out_for_delivery",
  on_the_way: "out_for_delivery",
};
const CLOSED_STATUSES = [
  "canceled",
  "cancelled",
  "rejected",
  "delivered",
  "completed",
];

const adaptOrder = (raw) => {
  if (!raw) return null;

  const address = safeParse(raw.shippingAddress, {}) || {};
  const branchSnapshot = safeParse(raw.branchSnapshot, {}) || {};

  const rawStatus = String(raw.status || "").toLowerCase();
  let status = STATUS_ALIASES[rawStatus] || rawStatus;
  if (!CLOSED_STATUSES.includes(status)) {
    if (raw.deliveredAt) status = "delivered";
    else if (raw.pickedUpAt) status = "out_for_delivery";
  }

  const items = (raw.items || []).map((item) => {
    const variations = safeParse(item.variations, [])
      .map((v) => ({
        label: v.variationName || "",
        value: v.optionName || "",
        price: toNumber(v.additionalPrice ?? v.price),
      }))
      .filter((v) => v.value);

    const addons = safeParse(item.addons, [])
      .map((a) => ({
        name: a.name || a.addonName || a.optionName || "",
        quantity: toNumber(a.quantity) || 1,
        price: toNumber(a.additionalPrice ?? a.price),
      }))
      .filter((a) => a.name);

    return {
      id: item.id,
      name: String(item.foodName || "").trim(),
      nameAr: String(item.foodNameAr || "").trim(),
      quantity: toNumber(item.quantity) || 1,
      price: toNumber(item.basePrice),
      total: toNumber(item.totalPrice),
      notes: item.note,
      variations,
      addons,
    };
  });

  const gatewayType = raw.paymentGatewayType
    ? `${humanize(raw.paymentGatewayType).toLowerCase()} gateway`
    : "";
  const dailyOrderNumber =
    raw.dailyOrderNumber ??
    raw.daily_order_number ??
    "—";

  return {
    id: raw.id, // internal only
    dailyOrderNumber,
    orderType: raw.orderType,
    orderSource: raw.orderSource,
    prepMinutes: raw.durationOrderPreparing,
    shippingStatus: raw.shippingStatus,
    status,
    deliveryManId: raw.deliveryManId, // internal only
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    notes: raw.note,
    items,
    address: {
      title: address.title || "",
      street: address.street || address.location || address.fulladdress || "",
      details: [
        address.building && `Building ${address.building}`,
        address.floor && `Floor ${address.floor}`,
        address.apartment && `Apt ${address.apartment}`,
      ]
        .filter(Boolean)
        .join(" • "),
      landmark: address.landmark || "",
      zone: address.addressZoneName || "",
      phone: address.phone || "",
      lat: address.lat,
      lng: address.lng,
    },
    customer: {
      name: raw.user?.name || raw.customer?.name || "",
      phone: raw.user?.phone || raw.customer?.phone || address.phone || "",
      email: raw.user?.email || raw.customer?.email || "",
    },
    restaurant: {
      name: raw.restaurant?.name,
      phone: raw.restaurant?.phone,
      branchName: raw.branch?.name || branchSnapshot.name,
      branchAddress: raw.branch?.address || branchSnapshot.address,
    },
    deliveryMan: raw.deliveryMan || null,
    payment: {
      status: raw.paymentStatus,
      method:
        raw.paymentMethodName || raw.paymentGateway || gatewayType || "cash",
    },
    financials: {
      currency: CURRENCY,
      subtotal: toNumber(raw.subtotal),
      deliveryFee: toNumber(raw.deliveryFee),
      serviceFee: toNumber(raw.serviceFee),
      tax: 0,
      discount: toNumber(raw.discountAmount),
      total: toNumber(raw.totalAmount),
    },
    raw,
  };
};

const ORDER_TIMELINE_STAGES = [
  { key: "pending", label: "Order Placed", desc: "Received by system" },
  { key: "confirmed", label: "Confirmed", desc: "Accepted by restaurant" },
  { key: "preparing", label: "In Kitchen", desc: "Being prepared & packed" },
  {
    key: "out_for_delivery",
    label: "Out for Delivery",
    desc: "Driver en route",
  },
  { key: "delivered", label: "Delivered", desc: "Completed successfully" },
];

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [liveLocation, setLiveLocation] = useState(null);
  const { socket, status: socketStatus } = useTrackingSocket();

  // Fetch single order details: GET /api/shipping/orders/{id}
  const orderEndpoint = `/api/shipping/orders/${id}`;
  const { data, loading, error, refetch } = useGet(orderEndpoint);

  // Extract + adapt the order from the API response
  const order = useMemo(() => adaptOrder(unwrapOrder(data)), [data]);

  useEffect(() => {
    const terminalStatuses = [
      "delivered",
      "completed",
      "canceled",
      "cancelled",
      "rejected",
    ];
    const status = String(order?.status || "").toLowerCase();
    if (
      !socket ||
      !order?.id ||
      terminalStatuses.includes(status)
    ) {
      return undefined;
    }
    const getEventOrderId = (event) =>
      event?.orderId ??
      event?.order_id ??
      event?.order?.id ??
      event?.order?.orderId ??
      event?.id;
    const isCurrentOrderEvent = (event) => {
      const eventOrderId = getEventOrderId(event);
      return (
        eventOrderId == null || String(eventOrderId) === String(order.id)
      );
    };
    const handleCourierLocation = (update) => {
      if (!isCurrentOrderEvent(update)) return;
      const eventDeliveryManId =
        update?.deliveryManId ??
        update?.delivery_man_id ??
        update?.courierId ??
        update?.courier_id ??
        update?.driverId;
      if (
        eventDeliveryManId &&
        String(eventDeliveryManId) !== String(order.deliveryManId)
      ) {
        return;
      }

      const location =
        update?.location ||
        update?.coordinates ||
        update?.currentLocation ||
        update;
      const position = parseCoordinates(
        location?.lat ?? location?.latitude ?? update?.currentLat,
        location?.lng ?? location?.longitude ?? update?.currentLng,
      );
      if (position) {
        setLiveLocation({
          orderId: String(order.id),
          position,
          updatedAt: update.updatedAt || new Date().toISOString(),
        });
      }
    };
    const handlePickedUp = (event) => {
      if (!isCurrentOrderEvent(event)) return;
      toast.success("Order has been picked up.");
      refetch();
    };
    const handleDelivered = (event) => {
      if (!isCurrentOrderEvent(event)) return;
      toast.success("Order has been delivered.");
      refetch();
    };
    const handleOrderChanged = (event) => {
      if (isCurrentOrderEvent(event)) refetch();
    };
    const handleConnect = () => {
      socket.emit("order:track", { orderId: order.id });
      refetch();
    };

    socket.on("order:courier_location", handleCourierLocation);
    socket.on("order:assigned", handleOrderChanged);
    socket.on("order:courier_assigned", handleOrderChanged);
    socket.on("order:status_changed", handleOrderChanged);
    socket.on("order:manual_required", handleOrderChanged);
    socket.on("order:picked_up", handlePickedUp);
    socket.on("order:delivered", handleDelivered);
    socket.on("connect", handleConnect);
    if (socket.connected) {
      socket.emit("order:track", { orderId: order.id });
    }

    return () => {
      socket.off("order:courier_location", handleCourierLocation);
      socket.off("order:assigned", handleOrderChanged);
      socket.off("order:courier_assigned", handleOrderChanged);
      socket.off("order:status_changed", handleOrderChanged);
      socket.off("order:manual_required", handleOrderChanged);
      socket.off("order:picked_up", handlePickedUp);
      socket.off("order:delivered", handleDelivered);
      socket.off("connect", handleConnect);
      if (socket.connected) {
        socket.emit("order:untrack", { orderId: order.id });
      }
    };
  }, [order?.deliveryManId, order?.id, order?.status, refetch, socket]);

  const trackingMarkers = useMemo(() => {
    if (!order) return [];
    const raw = order.raw || {};
    const branch = raw.branch || {};
    const courier = raw.deliveryMan || order.deliveryMan;
    const activeLocation =
      liveLocation?.orderId === String(order.id)
        ? liveLocation.position
        : parseCoordinates(
            courier?.currentLat ?? courier?.lat,
            courier?.currentLng ?? courier?.lng,
          ) || getEntityCoordinates(courier);
    const branchPosition = parseCoordinates(branch.lat, branch.lng);
    const destinationPosition = parseCoordinates(
      order.address?.lat,
      order.address?.lng,
    );

    return [
      ...(branchPosition
        ? [
            {
              id: "branch",
              label: branch.name || "Branch",
              position: branchPosition,
              color: "#2563eb",
            },
          ]
        : []),
      ...(activeLocation
        ? [
            {
              id: "courier",
              label: order.deliveryMan?.name || "Delivery Man",
              detail:
                liveLocation?.orderId === String(order.id)
                  ? "Live position"
                  : "Last reported position",
              position: activeLocation,
              color: "#16a34a",
            },
          ]
        : []),
      ...(destinationPosition
        ? [
            {
              id: "destination",
              label: "Delivery destination",
              position: destinationPosition,
              color: "#dc2626",
            },
          ]
        : []),
    ];
  }, [liveLocation, order]);
  const trackingRoute = useMemo(
    () =>
      trackingMarkers
        .filter(
          (marker) => marker.id === "branch" || marker.id === "destination",
        )
        .map((marker) => marker.position),
    [trackingMarkers],
  );

  const statusInfo = useMemo(
    () => getOrderStatusInfo(order?.status),
    [order?.status],
  );
  const StatusIcon = statusInfo.icon;

  const copyToClipboard = (text, label = "Copied!") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="size-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground font-medium">
          Loading order details...
        </span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-12">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate("/orders")}
          className="gap-2 text-xs"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Orders</span>
        </Button>

        <Card className="border-destructive/30 bg-destructive/5 p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertCircle className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Order Not Found
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                {error
                  ? getErrorMessage(error, "Could not fetch order data.")
                  : "This order could not be located."}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className="size-3.5" />
                <span>Try Again</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => navigate("/orders")}
                className="text-xs"
              >
                Go to Orders List
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const isAssigned = Boolean(order.deliveryManId);
  const currentStep = statusInfo.stepIndex;

  return (
    <section className="w-full space-y-6 pb-12">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate("/orders")}
            className="size-9 shrink-0"
            title="Back to Orders list"
          >
            <ArrowLeft className="size-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Order {order.dailyOrderNumber}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.bg}`}
              >
                <StatusIcon className="size-3" />
                <span>{statusInfo.label}</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
              <span>Placed {formatDateTime(order.createdAt)}</span>
              {order.createdAt && (
                <>
                  <span>•</span>
                  <span>{formatRelativeTime(order.createdAt)}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 h-9 text-xs"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setAssignDialogOpen(true)}
            className="gap-1.5 h-9 text-xs"
          >
            <Truck className="size-4" />
            <span>{isAssigned ? "Change Driver" : "Assign Delivery Man"}</span>
          </Button>
        </div>
      </div>

      {/* Visual Timeline / Progress Stepper */}
      {order.status !== "canceled" && order.status !== "rejected" && (
        <Card className="border-border/60 shadow-2xs">
          <CardContent className="p-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">
              Delivery Progress
            </h2>

            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              {ORDER_TIMELINE_STAGES.map((stage, index) => {
                const isPassed = currentStep > index;
                const isCurrent = currentStep === index;

                return (
                  <div
                    key={stage.key}
                    className="flex-1 flex md:flex-col items-center gap-3 relative w-full md:w-auto"
                  >
                    {/* Connecting line for desktop */}
                    {index < ORDER_TIMELINE_STAGES.length - 1 && (
                      <div
                        className={`hidden md:block absolute top-4 left-1/2 w-full h-0.5 -z-0 transition-colors ${
                          isPassed ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}

                    {/* Step Icon Bubble */}
                    <div
                      className={`size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all z-10 ${
                        isPassed
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : isCurrent
                            ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-xs"
                            : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {isPassed ? (
                        <Check className="size-4 stroke-[3]" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>

                    {/* Step Details */}
                    <div className="md:text-center min-w-0">
                      <p
                        className={`text-xs font-semibold ${
                          isCurrent
                            ? "text-foreground"
                            : isPassed
                              ? "text-foreground/80"
                              : "text-muted-foreground"
                        }`}
                      >
                        {stage.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {stage.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Grid: Left Column 2/3, Right Column 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Delivery Driver Assignment & Destination */}
          <Card className="border-border/60 shadow-2xs overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="size-4 text-primary" />
                <CardTitle className="text-sm font-bold">
                  Delivery & Driver
                </CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAssignDialogOpen(true)}
                className="h-7 text-xs gap-1"
              >
                <UserCheck className="size-3" />
                <span>{isAssigned ? "Reassign Driver" : "Assign Driver"}</span>
              </Button>
            </CardHeader>

            <CardContent className="p-5 space-y-5">
              {/* Driver info block */}
              {isAssigned ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center text-base shrink-0 shadow-2xs">
                      {order.deliveryMan?.image ? (
                        <img
                          src={order.deliveryMan.image}
                          alt={order.deliveryMan.name}
                          className="size-full rounded-xl object-cover"
                        />
                      ) : (
                        (order.deliveryMan?.name?.[0] || "D").toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {order.deliveryMan?.name || "Assigned Driver"}
                        </span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
                          Assigned
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {order.deliveryMan?.phone && (
                          <a
                            href={`tel:${order.deliveryMan.phone}`}
                            className="flex items-center gap-1 font-mono text-foreground hover:text-primary transition-colors"
                          >
                            <Phone className="size-3 text-primary" />
                            {order.deliveryMan.phone}
                          </a>
                        )}
                        {order.deliveryMan?.deliveryType && (
                          <span className="capitalize text-[11px] bg-muted px-1.5 py-0.5 rounded">
                            {order.deliveryMan.deliveryType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {order.deliveryMan?.phone && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        asChild
                        className="h-8 text-xs gap-1.5"
                      >
                        <a href={`tel:${order.deliveryMan.phone}`}>
                          <Phone className="size-3.5" />
                          <span>Call Driver</span>
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <AlertTriangle className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        No delivery driver assigned yet
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        This order needs a delivery driver to be assigned before
                        pickup.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setAssignDialogOpen(true)}
                    className="h-8 text-xs gap-1.5 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Truck className="size-3.5" />
                    <span>Assign Now</span>
                  </Button>
                </div>
              )}

              {/* Delivery destination address */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Destination Address
                </span>
                <div className="flex items-start gap-2.5 text-xs text-foreground bg-muted/30 p-3 rounded-xl border border-border/60">
                  <MapPin className="size-4 shrink-0 text-primary mt-0.5" />
                  <div className="space-y-1">
                    {order.address?.title && (
                      <p className="font-semibold" dir="auto">
                        {order.address.title}
                      </p>
                    )}
                    {order.address?.street && (
                      <p className="text-muted-foreground" dir="auto">
                        {order.address.street}
                      </p>
                    )}
                    {order.address?.details && (
                      <p className="text-muted-foreground">
                        {order.address.details}
                      </p>
                    )}
                    {order.address?.landmark && (
                      <p className="text-muted-foreground" dir="auto">
                        Landmark: {order.address.landmark}
                      </p>
                    )}
                    {order.address?.zone && (
                      <p className="text-[11px] text-muted-foreground">
                        Zone: {order.address.zone}
                      </p>
                    )}
                    {order.notes && (
                      <p className="text-[11px] text-muted-foreground italic">
                        Note: &ldquo;{order.notes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isAssigned && (
            <Card className="overflow-hidden border-border/60 shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/50 bg-muted/20 pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <MapPin className="size-4 text-primary" />
                    Live Delivery Tracking
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {liveLocation?.orderId === String(order.id) &&
                    liveLocation.updatedAt
                      ? `Updated ${formatRelativeTime(liveLocation.updatedAt)}`
                      : "Showing the most recently reported courier position."}
                  </p>
                </div>
                <div
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    socketStatus === "connected"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : socketStatus === "error"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Radio className="size-3" />
                  {socketStatus === "connected"
                    ? "Live"
                    : socketStatus === "connecting"
                      ? "Connecting"
                      : socketStatus === "error"
                        ? "Connection failed"
                        : "Disconnected"}
                </div>
              </CardHeader>
              <CardContent className="p-3">
                {trackingMarkers.length ? (
                  <>
                    <LiveTrackingMap
                      markers={trackingMarkers}
                      route={trackingRoute}
                      className="h-[320px]"
                    />
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
                      {trackingMarkers.map((marker) => (
                        <span
                          key={marker.id}
                          className="inline-flex items-center gap-1.5"
                        >
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: marker.color }}
                          />
                          {marker.label}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                    <MapPin className="size-5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      No coordinates are available for this order yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Card 2: Order Items */}
          <Card className="border-border/60 shadow-2xs overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="size-4 text-primary" />
                  <CardTitle className="text-sm font-bold">
                    Order Items
                  </CardTitle>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {order.items?.length || 0} items
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {order.items?.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No individual line items detailed in order payload.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {order.items.map((item, index) => {
                    const itemName = item.name || `Item #${index + 1}`;
                    const itemQty = item.quantity || item.qty || 1;
                    const itemPrice = item.price || item.unitPrice || 0;
                    const lineTotal = item.total || itemQty * itemPrice;

                    return (
                      <div
                        key={item.id || index}
                        className="p-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0 border overflow-hidden">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={itemName}
                                className="size-full object-cover"
                              />
                            ) : (
                              <Package className="size-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-foreground truncate">
                              {itemName}
                            </p>
                            {item.nameAr && item.nameAr !== item.name && (
                              <p
                                className="text-[11px] text-muted-foreground"
                                dir="rtl"
                              >
                                {item.nameAr}
                              </p>
                            )}
                            {item.variations?.map((v, i) => (
                              <p
                                key={`v-${i}`}
                                className="text-[11px] text-muted-foreground"
                              >
                                {v.label ? `${v.label}: ` : ""}
                                {v.value}
                                {v.price > 0 &&
                                  ` (+${formatCurrency(v.price, order.financials?.currency)})`}
                              </p>
                            ))}
                            {item.addons?.map((a, i) => (
                              <p
                                key={`a-${i}`}
                                className="text-[11px] text-muted-foreground"
                              >
                                + {a.name}
                                {a.quantity > 1 && ` ×${a.quantity}`}
                                {a.price > 0 &&
                                  ` (${formatCurrency(a.price, order.financials?.currency)})`}
                              </p>
                            ))}
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Qty: {itemQty} ×{" "}
                              {formatCurrency(
                                itemPrice,
                                order.financials?.currency,
                              )}
                            </p>
                            {item.notes && (
                              <p className="text-[10px] text-muted-foreground/80 italic mt-0.5">
                                Note: {item.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-xs text-foreground font-mono">
                            {formatCurrency(
                              lineTotal,
                              order.financials?.currency,
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Restaurant Information */}
          <Card className="border-border/60 shadow-2xs">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Store className="size-4 text-primary" />
                <CardTitle className="text-sm font-bold">
                  Restaurant Information
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex items-center gap-3.5">
                <div className="size-12 rounded-xl bg-muted border flex items-center justify-center overflow-hidden shrink-0">
                  {order.restaurant?.logo ? (
                    <img
                      src={order.restaurant.logo}
                      alt={order.restaurant.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Store className="size-6 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    {order.restaurant?.name || "Restaurant"}
                  </h3>
                  {order.restaurant?.nameAr && (
                    <p className="text-xs text-muted-foreground" dir="rtl">
                      {order.restaurant.nameAr}
                    </p>
                  )}
                  {order.restaurant?.branchAddress && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 max-w-md">
                      {order.restaurant.branchAddress}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    {order.restaurant?.branchName && (
                      <span className="font-medium">
                        Branch: {order.restaurant.branchName}
                      </span>
                    )}
                    {order.restaurant?.phone && (
                      <a
                        href={`tel:${order.restaurant.phone}`}
                        className="flex items-center gap-1 font-mono hover:text-primary transition-colors"
                      >
                        <Phone className="size-3" />
                        {order.restaurant.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 col) */}
        <div className="space-y-6">
          {/* Customer Details Card */}
          <Card className="border-border/60 shadow-2xs">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <User className="size-4 text-primary" />
                <CardTitle className="text-sm font-bold">
                  Customer Details
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                  {(order.customer?.name?.[0] || "C").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-foreground truncate">
                    {order.customer?.name || "Customer"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Registered User
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
                {order.customer?.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Phone className="size-3.5" />
                      Phone:
                    </span>
                    <a
                      href={`tel:${order.customer.phone}`}
                      className="font-mono text-foreground hover:text-primary font-medium"
                    >
                      {order.customer.phone}
                    </a>
                  </div>
                )}
                {order.customer?.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Mail className="size-3.5" />
                      Email:
                    </span>
                    <a
                      href={`mailto:${order.customer.email}`}
                      className="text-foreground hover:text-primary truncate max-w-44"
                    >
                      {order.customer.email}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment & Financial Summary Card */}
          <Card className="border-border/60 shadow-2xs">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-primary" />
                <CardTitle className="text-sm font-bold">
                  Payment Summary
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Payment Status:</span>
                <span
                  className={`capitalize font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                    order.payment?.status === "paid"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {order.payment?.status || "unpaid"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-medium text-foreground capitalize flex items-center gap-1">
                  <CreditCard className="size-3 text-muted-foreground" />
                  {(order.payment?.method || "cash").replace(/_/g, " ")}
                </span>
              </div>

              <Separator className="my-2" />

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">
                    {formatCurrency(
                      order.financials?.subtotal,
                      order.financials?.currency,
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Fee</span>
                  <span className="font-mono">
                    {formatCurrency(
                      order.financials?.deliveryFee,
                      order.financials?.currency,
                    )}
                  </span>
                </div>

                {order.financials?.serviceFee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Service Fee</span>
                    <span className="font-mono">
                      {formatCurrency(
                        order.financials?.serviceFee,
                        order.financials?.currency,
                      )}
                    </span>
                  </div>
                )}

                {order.financials?.tax > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax & VAT</span>
                    <span className="font-mono">
                      {formatCurrency(
                        order.financials?.tax,
                        order.financials?.currency,
                      )}
                    </span>
                  </div>
                )}

                {order.financials?.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount</span>
                    <span className="font-mono">
                      -
                      {formatCurrency(
                        order.financials?.discount,
                        order.financials?.currency,
                      )}
                    </span>
                  </div>
                )}
              </div>

              <Separator className="my-2" />

              <div className="flex justify-between items-center text-sm font-bold pt-1">
                <span>Grand Total</span>
                <span className="text-base text-primary font-mono">
                  {formatCurrency(
                    order.financials?.total,
                    order.financials?.currency,
                  )}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Metadata Card */}
          <Card className="border-border/60 shadow-2xs">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Order Reference
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Daily Order #:</span>
                <div className="flex items-center gap-1 font-mono text-[11px]">
                  <span className="text-foreground">{order.dailyOrderNumber}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      copyToClipboard(
                        String(order.dailyOrderNumber),
                        "Daily order number copied!",
                      )
                    }
                    disabled={order.dailyOrderNumber === "—"}
                    className="size-6 text-muted-foreground hover:text-foreground"
                    title="Copy daily order number"
                  >
                    <Copy className="size-3" />
                  </Button>
                </div>
              </div>

              {order.orderType && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Order Type:</span>
                  <span className="capitalize text-foreground">
                    {humanize(order.orderType)}
                  </span>
                </div>
              )}

              {order.orderSource && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Source:</span>
                  <span className="capitalize text-foreground">
                    {humanize(order.orderSource)}
                  </span>
                </div>
              )}

              {order.prepMinutes ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Prep Time:</span>
                  <span className="text-foreground">
                    {order.prepMinutes} min
                  </span>
                </div>
              ) : null}

              {order.updatedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="font-mono text-[11px] text-foreground">
                    {formatDateTime(order.updatedAt)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Delivery Man Dialog */}
      <AssignDeliveryManDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        order={order.raw || order}
        orderId={id}
        onSuccess={() => {
          refetch();
        }}
      />
    </section>
  );
};

export default OrderDetail;
