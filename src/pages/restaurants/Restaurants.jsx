import { useMemo, useState } from 'react';
import {
  Store,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Truck,
  Bike,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  GitBranch,
} from 'lucide-react';
import useGet from '../../hooks/useGet';
import getErrorMessage from '../../lib/Geterrormessage';
import GenericDataTable from '../../components/shared/GenericDataTable';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import RestaurantBranchesDialog from './RestaurantBranchesDialog';

const RESTAURANTS_URL = '/api/shipping/restaurants';
const QUERY_KEY = [RESTAURANTS_URL];

const Restaurants = () => {
  const { data, loading, error, refetch } = useGet(RESTAURANTS_URL);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  // Extract restaurants safely from the response structure:
  // response: { success: true, data: { message: "...", data: [...] } }
  const restaurants = useMemo(() => {
    const rawList =
      data?.data?.data || (Array.isArray(data?.data) ? data?.data : []);
    if (!Array.isArray(rawList)) return [];

    return [...rawList].sort((a, b) => {
      const timeA = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
      const timeB = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [data]);

  // Summary statistics
  const stats = useMemo(() => {
    const total = restaurants.length;
    const active = restaurants.filter(
      (r) => r.status === 'active' || r.status === true
    ).length;
    const inactive = total - active;
    const withDelivery = restaurants.filter(
      (r) => r.homeDelivery || r.selfDelivery
    ).length;

    return { total, active, inactive, withDelivery };
  }, [restaurants]);

  const columns = useMemo(
    () => [
      {
        id: 'restaurant',
        header: 'Restaurant',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-3 text-left">
              <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-muted/40 shadow-xs">
                {item.logo ? (
                  <img
                    src={item.logo}
                    alt={item.name || 'Restaurant Logo'}
                    className="size-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <Store className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">
                  {item.name || 'Unnamed Restaurant'}
                </span>
                {item.nameAr && (
                  <span className="text-xs text-muted-foreground" dir="rtl">
                    {item.nameAr}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
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
        accessorKey: 'address',
        header: 'Address',
        cell: ({ row }) => {
          const item = row.original;
          const address = item.address;
          const hasCoords = item.lat != null && item.lng != null;

          if (!address && !hasCoords) {
            return <span className="text-muted-foreground">—</span>;
          }

          return (
            <div className="inline-flex items-center gap-1.5 text-sm">
              <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="capitalize">{address || 'View on map'}</span>
              {hasCoords && (
                <a
                  href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center"
                  title="Open location in Google Maps"
                >
                  <ExternalLink className="size-3 ml-0.5" />
                </a>
              )}
            </div>
          );
        },
      },
      {
        id: 'deliveryServices',
        header: 'Delivery Type',
        cell: ({ row }) => {
          const { homeDelivery, selfDelivery } = row.original;
          const activeTypes = [];

          if (homeDelivery) {
            activeTypes.push({
              key: 'home',
              label: 'Home Delivery',
              icon: Bike,
              className:
                'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
            });
          }

          if (selfDelivery) {
            activeTypes.push({
              key: 'self',
              label: 'Self Delivery',
              icon: Truck,
              className:
                'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400',
            });
          }

          if (activeTypes.length === 0) {
            return <span className="text-muted-foreground">—</span>;
          }

          return (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {activeTypes.map(({ key, label, icon: Icon, className }) => (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border ${className}`}
                >
                  <Icon className="size-3" />
                  {label}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status;
          const isActive = status === 'active' || status === true;
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${isActive
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
          );
        },
      },

      {
        id: 'branches',
        header: 'Branches',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedRestaurant(item)}
              className="h-8 gap-1.5 text-xs font-medium hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all"
            >
              <GitBranch className="size-3.5 text-primary" />
              <span>Branches</span>
            </Button>
          );
        },
      },
    ],
    []
  );

  return (
    <section className="space-y-6">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Total Assigned
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight">
              {stats.total}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Active</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.active}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Inactive</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-zinc-500">
              {stats.inactive}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Delivery Enabled
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {stats.withDelivery}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>
              Failed to load assigned restaurants:{' '}
              {getErrorMessage(error, 'Unknown error')}
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

      {/* Main Table */}
      <GenericDataTable
        title="Assigned Restaurants"
        data={restaurants}
        columns={columns}
        isLoading={loading}
        queryKey={QUERY_KEY}
        sortByDate={false}
        actions={false}
      />

      {/* Branches Modal */}
      <RestaurantBranchesDialog
        restaurant={selectedRestaurant}
        open={Boolean(selectedRestaurant)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedRestaurant(null);
        }}
      />
    </section>
  );
};

export default Restaurants;
