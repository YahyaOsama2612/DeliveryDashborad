import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  Store,
  Truck,
  UserCheck,
} from 'lucide-react';
import useGet from '../../hooks/useGet';
import getErrorMessage from '../../lib/Geterrormessage';
import QueryErrorNotice from '../../components/shared/QueryErrorNotice';
import useTrackingSocket from '../../hooks/useTrackingSocket';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import AssignDeliveryManDialog from './AssignDeliveryManDialog';
import {
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
  getOrderStatusInfo,
  normalizeOrder,
} from './orderUtils';

const ORDERS_URL = '/api/shipping/orders';
const RESTAURANTS_URL = '/api/shipping/restaurants';
const DELIVERY_MEN_URL = '/api/shipping/delivery-men';
const PAGE_SIZE_OPTIONS = [10, 15, 25, 50];

// Values accepted by the API `status` param.
// (The Apidog description is cut off after "preparing" — add any others here.)
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'canceled', label: 'Canceled' },
];

// Filters that are sent to the API as query params
const INITIAL_FILTERS = {
  status: '',
  restaurantId: '',
  branchId: '',
  deliveryManId: '',
  fromDate: '',
  toDate: '',
};

const selectClass =
  'h-9 rounded-md border border-input bg-background px-2.5 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

// Extract an array from the common API response shapes
const toList = (res) => {
  const candidate =
    res?.data?.data ||
    res?.data?.items ||
    (Array.isArray(res?.data) ? res.data : null) ||
    res?.items ||
    (Array.isArray(res) ? res : null);
  return Array.isArray(candidate) ? candidate : [];
};

const Orders = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { socket } = useTrackingSocket();

  // Dialog state for assigning a driver to an order
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState(null);

  // Server-side filters (sent as query params)
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  // Client-side filters (the API has no params for these, so they apply to the loaded page)
  const [search, setSearch] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('all'); // 'all', 'assigned', 'unassigned'
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'paid', 'unpaid'

  // Server-side pagination (page / limit params)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Build query params — empty values are not sent
  const queryParams = useMemo(() => {
    const params = { page, limit };
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    return params;
  }, [filters, page, limit]);

  // Data fetching
  const { data, loading, error, refetch } = useGet(ORDERS_URL, queryParams);

  // Options for the filter dropdowns
  const {
    data: restaurantsData,
    error: restaurantsError,
    refetch: refetchRestaurants,
  } = useGet(RESTAURANTS_URL);
  const {
    data: branchesData,
    loading: loadingBranches,
    error: branchesError,
    refetch: refetchBranches,
  } = useGet(
    filters.restaurantId
      ? `${RESTAURANTS_URL}/${filters.restaurantId}/branches`
      : '',
    {},
    Boolean(filters.restaurantId)
  );
  const {
    data: driversData,
    error: driversError,
    refetch: refetchDrivers,
  } = useGet(DELIVERY_MEN_URL);

  const restaurants = useMemo(() => toList(restaurantsData), [restaurantsData]);
  const branches = useMemo(() => toList(branchesData), [branchesData]);
  const drivers = useMemo(() => toList(driversData), [driversData]);

  useEffect(() => {
    if (!socket) return undefined;

    const refreshOrders = () =>
      queryClient.invalidateQueries({ queryKey: [ORDERS_URL] });
    const refreshDrivers = () =>
      queryClient.invalidateQueries({ queryKey: [DELIVERY_MEN_URL] });
    const orderEvents = [
      'order:assigned',
      'order:courier_assigned',
      'order:status_changed',
      'order:picked_up',
      'order:delivered',
      'order:manual_required',
    ];
    const handleConnect = () => {
      refreshOrders();
      refreshDrivers();
    };

    orderEvents.forEach((eventName) => socket.on(eventName, refreshOrders));
    socket.on('delivery:shift_changed', refreshDrivers);
    socket.on('connect', handleConnect);
    if (socket.connected) handleConnect();

    return () => {
      orderEvents.forEach((eventName) =>
        socket.off(eventName, refreshOrders),
      );
      socket.off('delivery:shift_changed', refreshDrivers);
      socket.off('connect', handleConnect);
    };
  }, [queryClient, socket]);

  // Safely extract and normalize orders
  const orders = useMemo(() => {
    if (!data) return [];
    const candidate =
      data?.data?.data ||
      data?.data?.orders ||
      data?.data?.items ||
      (Array.isArray(data?.data) ? data?.data : null) ||
      data?.orders ||
      data?.items ||
      (Array.isArray(data) ? data : []);

    if (!Array.isArray(candidate)) return [];
    return candidate.map(normalizeOrder);
  }, [data]);

  // Pagination info from the response (supports several common shapes)
  const pagination = useMemo(() => {
    const p =
      data?.data?.pagination ||
      data?.pagination ||
      data?.data?.meta ||
      data?.meta ||
      {};
    const total =
      p.total ??
      p.totalItems ??
      p.totalCount ??
      data?.data?.total ??
      data?.total ??
      null;
    const totalPages =
      p.totalPages ??
      p.pages ??
      p.lastPage ??
      (total != null ? Math.max(1, Math.ceil(total / limit)) : null);
    return { total, totalPages };
  }, [data, limit]);

  const hasNextPage =
    pagination.totalPages != null
      ? page < pagination.totalPages
      : orders.length >= limit;

  // Statistics summary (counts reflect the loaded page, total comes from the server)
  const stats = useMemo(() => {
    const total = pagination.total ?? orders.length;
    let pending = 0;
    let inTransit = 0;
    let delivered = 0;
    let unassigned = 0;

    orders.forEach((o) => {
      const s = o.status;
      if (
        s === 'pending' ||
        s === 'confirmed' ||
        s === 'accepted' ||
        s === 'preparing' ||
        s === 'in_preparation' ||
        s === 'ready' ||
        s === 'ready_for_pickup'
      ) {
        pending += 1;
      } else if (
        s === 'out_for_delivery' ||
        s === 'on_the_way' ||
        s === 'picked_up'
      ) {
        inTransit += 1;
      } else if (s === 'delivered' || s === 'completed') {
        delivered += 1;
      }

      if (!o.deliveryManId && s !== 'delivered' && s !== 'canceled') {
        unassigned += 1;
      }
    });

    return { total, pending, inTransit, delivered, unassigned };
  }, [orders, pagination.total]);

  // Client-side filtering of the current page (search / assignment / payment)
  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter((order) => {
      if (term) {
        const matchesOrder =
          String(order.orderNumber || '').toLowerCase().includes(term) ||
          String(order.id || '').toLowerCase().includes(term);
        const matchesCustomer =
          (order.customer?.name || '').toLowerCase().includes(term) ||
          (order.customer?.phone || '').toLowerCase().includes(term);
        const matchesRestaurant =
          (order.restaurant?.name || '').toLowerCase().includes(term) ||
          (order.restaurant?.branchName || '').toLowerCase().includes(term);
        const matchesDriver =
          (order.deliveryMan?.name || '').toLowerCase().includes(term) ||
          (order.deliveryMan?.phone || '').toLowerCase().includes(term);
        const matchesAddress = (order.address?.text || '')
          .toLowerCase()
          .includes(term);

        if (
          !matchesOrder &&
          !matchesCustomer &&
          !matchesRestaurant &&
          !matchesDriver &&
          !matchesAddress
        ) {
          return false;
        }
      }

      if (assignmentFilter === 'assigned' && !order.deliveryManId) return false;
      if (assignmentFilter === 'unassigned' && order.deliveryManId) return false;

      if (paymentFilter !== 'all' && order.payment?.status !== paymentFilter) {
        return false;
      }

      return true;
    });
  }, [orders, search, assignmentFilter, paymentFilter]);

  const hasActiveFilters =
    Boolean(search) ||
    assignmentFilter !== 'all' ||
    paymentFilter !== 'all' ||
    Object.values(filters).some(Boolean);

  // Changing a server-side filter goes back to page 1
  const updateFilter = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'restaurantId') next.branchId = ''; // branches depend on restaurant
      return next;
    });
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setSearch('');
    setAssignmentFilter('all');
    setPaymentFilter('all');
    setPage(1);
  };

  const handleOpenAssign = (order, e) => {
    e?.stopPropagation();
    setSelectedOrderForAssign(order);
    setAssignDialogOpen(true);
  };

  return (
    <section className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Package className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Orders
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live order management, driver dispatching, and status monitoring.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
            className="gap-1.5 h-9"
          >
            <RefreshCw
              className={`size-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>Failed to load orders: {getErrorMessage(error)}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-7 text-xs border-destructive/30 text-destructive bg-background"
          >
            Retry
          </Button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="border-border/60 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">
                Total Orders
              </p>
              <p className="text-xl font-bold text-foreground">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-amber-500"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)' }}
            >
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">
                In Kitchen / Pending
              </p>
              <p className="text-xl font-bold text-foreground">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sky-500"
              style={{ backgroundColor: 'rgba(14, 165, 233, 0.12)' }}
            >
              <Truck className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">
                Out for Delivery
              </p>
              <p className="text-xl font-bold text-foreground">{stats.inTransit}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-emerald-500"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)' }}
            >
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">
                Delivered
              </p>
              <p className="text-xl font-bold text-foreground">{stats.delivered}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => setAssignmentFilter('unassigned')}
          className={`border-border/60 shadow-2xs cursor-pointer transition-colors ${assignmentFilter === 'unassigned'
            ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500'
            : 'hover:bg-muted/40'
            }`}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">
                Needs Driver
              </p>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                {stats.unassigned}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-2xs">
        {/* Row 1: search + client-side filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search this page by order #, customer, restaurant, phone, driver..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by Driver Assignment"
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
              className={selectClass}
            >
              <option value="all">All Assignments</option>
              <option value="assigned">Driver Assigned</option>
              <option value="unassigned">Unassigned (Needs Driver)</option>
            </select>

            <select
              aria-label="Filter by Payment"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className={selectClass}
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: server-side filters (API query params) */}
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
          <select
            aria-label="Filter by Status"
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className={selectClass}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Restaurant"
            value={filters.restaurantId}
            onChange={(e) => updateFilter('restaurantId', e.target.value)}
            className={selectClass}
          >
            <option value="">All Restaurants</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Branch"
            value={filters.branchId}
            onChange={(e) => updateFilter('branchId', e.target.value)}
            disabled={!filters.restaurantId || loadingBranches}
            className={selectClass}
          >
            <option value="">
              {!filters.restaurantId
                ? 'Select restaurant first'
                : loadingBranches
                  ? 'Loading branches...'
                  : 'All Branches'}
            </option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Delivery Man"
            value={filters.deliveryManId}
            onChange={(e) => updateFilter('deliveryManId', e.target.value)}
            className={selectClass}
          >
            <option value="">All Delivery Men</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name || 'Unnamed Driver'}
              </option>
            ))}
          </select>

          <Input
            type="date"
            aria-label="From date"
            title="From date"
            value={filters.fromDate}
            max={filters.toDate || undefined}
            onChange={(e) => updateFilter('fromDate', e.target.value)}
            className="h-9 text-xs"
          />

          <Input
            type="date"
            aria-label="To date"
            title="To date"
            value={filters.toDate}
            min={filters.fromDate || undefined}
            onChange={(e) => updateFilter('toDate', e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        <p className="text-[11px] text-muted-foreground">
          Status, restaurant, branch, driver and dates filter all orders on the
          server. Search, assignment and payment only filter the page you are
          viewing.
        </p>
        {(restaurantsError || branchesError || driversError) && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {restaurantsError && (
              <QueryErrorNotice
                error={restaurantsError}
                onRetry={refetchRestaurants}
              />
            )}
            {branchesError && (
              <QueryErrorNotice
                error={branchesError}
                onRetry={refetchBranches}
              />
            )}
            {driversError && (
              <QueryErrorNotice
                error={driversError}
                onRetry={refetchDrivers}
              />
            )}
          </div>
        )}
      </div>

      {/* Orders Table Container */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-12 text-center text-xs">#</TableHead>
              <TableHead className="text-xs">Order</TableHead>
              <TableHead className="text-xs">Restaurant</TableHead>
              <TableHead className="text-xs">Customer</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Delivery Driver</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
              <TableHead className="text-xs text-center w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-44 text-center text-xs text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="size-5 animate-spin text-primary" />
                    <span>Loading orders...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : visibleOrders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-44 text-center text-xs text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2 py-4">
                    <Package className="size-8 text-muted-foreground/50" />
                    <p className="font-semibold text-foreground">
                      No orders found
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {hasActiveFilters
                        ? 'Try clearing active filters to see all orders.'
                        : 'There are currently no orders registered in the system.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              visibleOrders.map((order, idx) => {
                const statusInfo = getOrderStatusInfo(order.status);
                const StatusIcon = statusInfo.icon;
                const isAssigned = Boolean(order.deliveryManId);

                return (
                  <TableRow
                    key={order.id || idx}
                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    {/* Index */}
                    <TableCell className="text-center text-[11px] text-muted-foreground font-mono">
                      {(page - 1) * limit + idx + 1}
                    </TableCell>

                    {/* Order Code & Date */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-foreground hover:text-primary transition-colors">
                          {order.orderNumber}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="size-3" />
                          {formatRelativeTime(order.createdAt) ||
                            formatDateTime(order.createdAt)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Restaurant */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0 border overflow-hidden">
                          {order.restaurant?.logo ? (
                            <img
                              src={order.restaurant.logo}
                              alt={order.restaurant.name}
                              className="size-full object-cover"
                            />
                          ) : (
                            <Store className="size-4 text-primary" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-xs text-foreground truncate max-w-36">
                            {order.restaurant?.name || 'Restaurant'}
                          </span>
                          {order.restaurant?.branchName && (
                            <span className="text-[11px] text-muted-foreground truncate max-w-36">
                              {order.restaurant.branchName}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Customer */}
                    <TableCell>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-xs text-foreground truncate max-w-40">
                          {order.customer?.name || 'Customer'}
                        </span>
                        {order.customer?.phone && (
                          <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="size-3" />
                            {order.customer.phone}
                          </span>
                        )}
                        {order.address?.text && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-44 flex items-center gap-1">
                            <MapPin className="size-3 shrink-0" />
                            {order.address.text}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusInfo.bg}`}
                      >
                        <StatusIcon className="size-3" />
                        <span>{statusInfo.label}</span>
                      </span>
                    </TableCell>

                    {/* Delivery Driver */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {isAssigned ? (
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {(order.deliveryMan?.name?.[0] || 'D').toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-foreground truncate max-w-32">
                              {order.deliveryMan?.name || 'Driver'}
                            </span>
                            {order.deliveryMan?.phone && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {order.deliveryMan.phone}
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => handleOpenAssign(order, e)}
                            className="size-6 text-muted-foreground hover:text-foreground"
                            title="Reassign driver"
                          >
                            <UserCheck className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleOpenAssign(order, e)}
                          className="h-7 text-[11px] gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                        >
                          <Truck className="size-3" />
                          <span>Assign Driver</span>
                        </Button>
                      )}
                    </TableCell>

                    {/* Total & Payment */}
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-xs text-foreground font-mono">
                          {formatCurrency(
                            order.financials?.total,
                            order.financials?.currency
                          )}
                        </span>
                        <span
                          className={`text-[10px] font-medium capitalize mt-0.5 px-1.5 py-0.2 rounded ${order.payment?.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground'
                            }`}
                        >
                          {order.payment?.status || 'unpaid'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell
                      className="text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="size-8"
                          title="View order details"
                        >
                          <Eye className="size-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleOpenAssign(order, e)}
                          className="size-8 text-primary hover:text-primary"
                          title={isAssigned ? 'Reassign driver' : 'Assign driver'}
                        >
                          <Truck className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row text-xs text-muted-foreground">
        <div>
          Showing{' '}
          <span className="font-medium text-foreground">
            {orders.length === 0 ? 0 : (page - 1) * limit + 1}
          </span>{' '}
          to{' '}
          <span className="font-medium text-foreground">
            {(page - 1) * limit + orders.length}
          </span>
          {pagination.total != null && (
            <>
              {' '}
              of{' '}
              <span className="font-medium text-foreground">
                {pagination.total}
              </span>
            </>
          )}{' '}
          orders
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="page-size-select" className="text-xs">
            Rows per page:
          </label>
          <select
            id="page-size-select"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-2xs"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="size-8"
            aria-label="Previous page"
          >
            <ArrowLeft className="size-3.5" />
          </Button>

          <span className="px-1 text-xs">
            {page}
            {pagination.totalPages != null ? ` / ${pagination.totalPages}` : ''}
          </span>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNextPage || loading}
            className="size-8"
            aria-label="Next page"
          >
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Assign Delivery Man Dialog */}
      <AssignDeliveryManDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        order={selectedOrderForAssign}
        onSuccess={() => {
          refetch();
        }}
      />
    </section>
  );
};

export default Orders;