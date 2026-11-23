import { useMemo } from 'react';
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  GitBranch,
  MapPin,
  Phone,
  RefreshCw,
  Store,
  Truck,
  XCircle,
} from 'lucide-react';
import useGet from '../../hooks/useGet';
import getErrorMessage from '../../lib/Geterrormessage';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

const RestaurantBranchesDialog = ({ restaurant, open, onOpenChange }) => {
  const branchesUrl = restaurant
    ? `/api/shipping/restaurants/${restaurant.id}/branches`
    : null;

  const { data, loading, error, refetch } = useGet(
    branchesUrl || '',
    {},
    Boolean(restaurant?.id && open)
  );

  const branches = useMemo(() => {
    const rawList =
      data?.data?.data || (Array.isArray(data?.data) ? data?.data : []);
    return Array.isArray(rawList) ? rawList : [];
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="border-b border-border/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-muted/40 shadow-xs">
              {restaurant?.logo ? (
                <img
                  src={restaurant.logo}
                  alt={restaurant.name || 'Restaurant'}
                  className="size-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <Store className="size-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <span>{restaurant?.name || 'Restaurant'} Branches</span>
                {branches.length > 0 && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                    {branches.length}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {restaurant?.nameAr && (
                  <span dir="rtl" className="mr-2">
                    {restaurant.nameAr} ·
                  </span>
                )}
                Branch details, delivery radius, and payment options
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="size-6 animate-spin text-primary mb-2" />
              <p className="text-sm font-medium">Loading branches...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
              <p className="font-medium">
                {getErrorMessage(error, 'Failed to load branches')}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mt-3 border-destructive/30 bg-background text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="size-3.5 mr-1" />
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && branches.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-3">
                <GitBranch className="size-6" />
              </div>
              <p className="text-base font-semibold text-foreground">
                No branches found
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                No active branches are currently registered for this restaurant.
              </p>
            </div>
          )}

          {!loading && !error && branches.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {branches.map((branch) => {
                const isActive =
                  branch.status === 'active' || branch.status === true;
                const hasCoords = branch.lat && branch.lng;

                return (
                  <div
                    key={branch.id}
                    className="flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-foreground text-sm">
                              {branch.name || 'Unnamed Branch'}
                            </span>
                            {branch.nameFr && (
                              <span className="text-xs text-muted-foreground font-normal">
                                ({branch.nameFr})
                              </span>
                            )}
                          </div>
                          {branch.nameAr && (
                            <p
                              className="text-xs text-muted-foreground mt-0.5"
                              dir="rtl"
                            >
                              {branch.nameAr}
                            </p>
                          )}
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                              : 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-400'
                          }`}
                        >
                          {isActive ? (
                            <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="size-3 text-zinc-500" />
                          )}
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        {branch.phoneNumber && (
                          <div className="flex items-center gap-2 text-foreground">
                            <Phone className="size-3.5 text-muted-foreground shrink-0" />
                            <a
                              href={`tel:${branch.phoneNumber}`}
                              className="hover:text-primary transition-colors font-medium"
                              dir="ltr"
                            >
                              {branch.phoneNumber}
                            </a>
                          </div>
                        )}

                        {branch.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">
                              {branch.address}
                              {branch.addressAr ? ` (${branch.addressAr})` : ''}
                            </span>
                            {hasCoords && (
                              <a
                                href={`https://www.google.com/maps?q=${branch.lat},${branch.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center shrink-0 ml-auto"
                                title="Open on Google Maps"
                              >
                                <ExternalLink className="size-3" />
                              </a>
                            )}
                          </div>
                        )}

                        {branch.deliveryRadiusKm && (
                          <div className="flex items-center gap-2">
                            <Truck className="size-3.5 text-muted-foreground shrink-0" />
                            <span>
                              Delivery radius: {branch.deliveryRadiusKm} km
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5">
                      <div className="flex items-center gap-1.5">
                        {branch.cash_status && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <Banknote className="size-3" />
                            Cash
                          </span>
                        )}
                        {branch.visa_status && (
                          <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                            <CreditCard className="size-3" />
                            Visa
                          </span>
                        )}
                      </div>

                      {branch.createdAt && (
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(branch.createdAt).toLocaleDateString(
                            undefined,
                            {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            }
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/70 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RestaurantBranchesDialog;
