import { useState, useMemo } from 'react';
import {
  AlertCircle,
  Check,
  Loader2,
  Phone,
  Search,
  Store,
  Truck,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import useGet from '../../hooks/useGet';
import getErrorMessage from '../../lib/Geterrormessage';
import QueryErrorNotice from '../../components/shared/QueryErrorNotice';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { normalizeOrder } from './orderUtils';

const GET_DELIVERY_MEN_URL = '/api/shipping/delivery-men';
const ORDERS_URL = '/api/shipping/orders';

const AssignDeliveryManDialog = ({
  open,
  onOpenChange,
  order,
  orderId: directOrderId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const normalizedOrder = useMemo(
    () => (order ? normalizeOrder(order) : null),
    [order]
  );
  const targetOrderId = directOrderId || normalizedOrder?.id;

  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterShift, setFilterShift] = useState('all'); // 'all', 'active', 'online'
  const [formError, setFormError] = useState('');

  // Fetch all delivery men for the selection
  const {
    data: driversData,
    loading: loadingDrivers,
    error: driversError,
    refetch: refetchDrivers,
  } = useGet(
    GET_DELIVERY_MEN_URL,
    {},
    open
  );

  // Extract drivers list safely
  const drivers = useMemo(() => {
    if (!driversData) return [];
    const candidate =
      driversData?.data?.data ||
      driversData?.data?.deliveryMen ||
      driversData?.data?.delivery_men ||
      driversData?.data?.drivers ||
      (Array.isArray(driversData?.data) ? driversData?.data : null) ||
      driversData?.deliveryMen ||
      driversData?.delivery_men ||
      driversData?.drivers ||
      (Array.isArray(driversData) ? driversData : []);
    return Array.isArray(candidate) ? candidate : [];
  }, [driversData]);

  const initialDriverId = useMemo(() => {
    const raw =
      normalizedOrder?.deliveryManId ||
      order?.deliveryManId ||
      order?.delivery_man_id ||
      order?.driverId ||
      order?.deliveryMan?.id ||
      '';
    return raw ? String(raw) : '';
  }, [normalizedOrder, order]);

  // Use selectedDriverId if set, otherwise default to initialDriverId
  const effectiveDriverId = selectedDriverId || initialDriverId;

  // Filtered drivers based on search & shift filter
  const filteredDrivers = useMemo(() => {
    let list = drivers;

    if (filterShift === 'active') {
      list = list.filter(
        (d) =>
          d.shiftStatus === 'active' ||
          d.shift_status === 'active' ||
          d.isAvailable === true
      );
    } else if (filterShift === 'online') {
      list = list.filter(
        (d) =>
          d.isOnline === true ||
          d.is_online === true ||
          d.online === true
      );
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return list;

    return list.filter((d) => {
      const name = (d.name || '').toLowerCase();
      const phone = (d.phone || '').toLowerCase();
      const type = (d.deliveryType || d.delivery_type || '').toLowerCase();
      return (
        name.includes(query) || phone.includes(query) || type.includes(query)
      );
    });
  }, [drivers, searchQuery, filterShift]);

  // Assignment Mutation: POST /api/shipping/orders/{id}/assign-delivery
  const assignMutation = useMutation({
    mutationFn: async ({ orderId, deliveryManId }) => {
      const response = await api.post(
        `/api/shipping/orders/${orderId}/assign`,
        { deliveryManId }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries so UI refreshes automatically
      queryClient.invalidateQueries({
        queryKey: [ORDERS_URL],
      });
      if (targetOrderId) {
        queryClient.invalidateQueries({
          queryKey: [ORDERS_URL, targetOrderId],
        });
        queryClient.invalidateQueries({
          queryKey: [`${ORDERS_URL}/${targetOrderId}`],
        });
      }
      queryClient.invalidateQueries({
        queryKey: [GET_DELIVERY_MEN_URL],
      });

      toast.success('Delivery man assigned successfully!');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      const msg = getErrorMessage(err, 'Failed to assign delivery man.');
      setFormError(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setFormError('');

    if (!targetOrderId) {
      setFormError('No valid order selected for assignment.');
      return;
    }

    if (!effectiveDriverId) {
      setFormError('Please select a delivery man.');
      return;
    }

    assignMutation.mutate({
      orderId: targetOrderId,
      deliveryManId: effectiveDriverId,
    });
  };

  const isCurrentDriver = (driverId) =>
    String(driverId) === String(normalizedOrder?.deliveryManId);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setFormError('');
          setSearchQuery('');
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Truck className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Assign Delivery Man
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Assign an active delivery driver to dispatch this restaurant order.
              </DialogDescription>
            </div>
          </div>

          {/* Order Summary Context Banner */}
          {normalizedOrder && (
            <div className="mt-4 rounded-xl border border-border/80 bg-background/80 p-3 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  Order {normalizedOrder.orderNumber}
                </span>
                <span className="text-muted-foreground font-mono">
                  {normalizedOrder.financials?.total
                    ? `${normalizedOrder.financials.total} ${normalizedOrder.financials.currency || 'EGP'}`
                    : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                <div className="flex items-center gap-1.5 truncate">
                  <Store className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">
                    {normalizedOrder.restaurant?.name || 'Restaurant'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <User className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {normalizedOrder.customer?.name || 'Customer'}
                  </span>
                </div>
              </div>

              {normalizedOrder.deliveryMan && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md flex items-center justify-between">
                  <span>Currently Assigned:</span>
                  <span className="font-semibold">
                    {normalizedOrder.deliveryMan.name || 'Driver'}
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {formError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {driversError && (
            <QueryErrorNotice
              error={driversError}
              onRetry={refetchDrivers}
            />
          )}

          {/* Search & Filter Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                Select Delivery Driver <span className="text-destructive">*</span>
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {filteredDrivers.length} available
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search drivers by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Chips */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setFilterShift('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${filterShift === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                All ({drivers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterShift('active')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${filterShift === 'active'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                Active Shift
              </button>
              <button
                type="button"
                onClick={() => setFilterShift('online')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${filterShift === 'online'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                Online Now
              </button>
            </div>
          </div>

          {/* Drivers List */}
          <div className="space-y-2">
            {loadingDrivers ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-xs">Loading delivery drivers...</span>
              </div>
            ) : filteredDrivers.length === 0 && driversError && !driversData ? null : filteredDrivers.length === 0 ? (
              <div className="py-8 text-center rounded-xl border border-dashed border-border/80 bg-muted/10 p-4">
                <Truck className="size-8 mx-auto text-muted-foreground/60 mb-2" />
                <p className="text-xs font-semibold text-foreground">
                  No drivers found
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {searchQuery
                    ? 'Try searching with a different name or phone number.'
                    : 'No delivery drivers match the active filter.'}
                </p>
                {filterShift !== 'all' && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-xs mt-1 h-auto p-0"
                    onClick={() => {
                      setFilterShift('all');
                      setSearchQuery('');
                    }}
                  >
                    Reset filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 -mr-1">
                {filteredDrivers.map((driver) => {
                  const driverId = String(driver.id || driver._id);
                  const isSelected = effectiveDriverId === driverId;
                  const isCurrentlyAssigned = isCurrentDriver(driverId);
                  const isActiveShift =
                    driver.shiftStatus === 'active' ||
                    driver.shift_status === 'active';
                  const isOnline =
                    driver.isOnline === true ||
                    driver.is_online === true ||
                    driver.online === true;

                  return (
                    <div
                      key={driverId}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedDriverId(driverId);
                        setFormError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedDriverId(driverId);
                          setFormError('');
                        }
                      }}
                      className={`group flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all ${isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                        : 'border-border/70 hover:border-border hover:bg-muted/40'
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Driver Initial Avatar */}
                        <div
                          className={`size-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
                            }`}
                        >
                          {driver.image ? (
                            <img
                              src={driver.image}
                              alt={driver.name}
                              className="size-full rounded-xl object-cover"
                            />
                          ) : (
                            (driver.name?.[0] || 'D').toUpperCase()
                          )}
                        </div>

                        {/* Driver Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground truncate">
                              {driver.name || 'Unnamed Driver'}
                            </span>
                            {isCurrentlyAssigned && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 rounded font-medium">
                                Current
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            {driver.phone && (
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="size-3" />
                                {driver.phone}
                              </span>
                            )}
                            <span className="capitalize text-[10px] px-1.5 py-0.5 rounded bg-muted/60">
                              {driver.deliveryType || 'outsource'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Indicators & Checkbox */}
                      <div className="flex items-center gap-2.5 shrink-0 pl-2">
                        {/* Status Pills */}
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isActiveShift
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-muted text-muted-foreground'
                              }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${isActiveShift ? 'bg-emerald-500' : 'bg-muted-foreground/60'
                                }`}
                            />
                            {isActiveShift ? 'Active Shift' : 'Inactive'}
                          </span>

                          <span className="text-[10px] text-muted-foreground">
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>

                        {/* Radio Check Circle */}
                        <div
                          className={`size-5 rounded-full border flex items-center justify-center transition-colors ${isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/30 bg-background'
                            }`}
                        >
                          {isSelected && <Check className="size-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={assignMutation.isPending}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              assignMutation.isPending ||
              loadingDrivers ||
              (Boolean(driversError) && !driversData) ||
              !effectiveDriverId ||
              !targetOrderId
            }
            className="gap-2 text-xs min-w-36"
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Assigning...</span>
              </>
            ) : (
              <>
                <UserCheck className="size-3.5" />
                <span>
                  {normalizedOrder?.deliveryMan ? 'Update Assignment' : 'Assign Driver'}
                </span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignDeliveryManDialog;
