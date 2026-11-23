import {
  Clock,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Shield,
  User,
} from 'lucide-react';
import useGet from '../../hooks/useGet';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  extractUser,
  formatDate,
  getErrorMessage,
  getRoleInfo,
  USERS_URL,
} from './userUtils';

const UserDetailsDialog = ({ userId, user: initialUser, open, onOpenChange, onEdit }) => {
  const singleUserUrl = userId ? `${USERS_URL}/${userId}` : '';
  const {
    data: fetchedData,
    loading,
    error,
    refetch,
  } = useGet(singleUserUrl, {}, Boolean(open && userId));

  const user = extractUser(fetchedData) || initialUser || null;
  const roleInfo = getRoleInfo(user?.role);
  const RoleIcon = roleInfo.icon;

  const initials = (user?.name || 'U')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/70 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">User Details</DialogTitle>

            </div>
          </div>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
            <RefreshCw className="size-6 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading user information...</p>
          </div>
        )}

        {error && !loading && !user && (
          <div className="space-y-4 py-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Shield className="size-6" />
            </div>
            <p role="alert" className="text-sm text-destructive">
              {getErrorMessage(error, 'Failed to load user details.')}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3.5 mr-1" />
              Retry
            </Button>
          </div>
        )}

        {user && (
          <div className="space-y-5 py-2">
            {/* User Profile Card */}
            <div className="flex items-center gap-4 rounded-xl border border-border/80 bg-muted/20 p-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 text-lg font-bold text-primary shadow-xs">
                {initials}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-bold text-foreground">
                    {user.name || 'Unnamed User'}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleInfo.badgeClass}`}
                  >
                    <RoleIcon className="size-3.5" />
                    {roleInfo.label}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{user.email || '—'}</p>
              </div>
            </div>

            {/* Role Capabilities description */}
            <div className="rounded-xl border border-border/70 bg-card p-3.5 text-xs">
              <div className="flex items-center gap-2 font-semibold text-foreground mb-1">
                <RoleIcon className="size-4 text-primary" />
                <span>Role: {roleInfo.label}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">{roleInfo.description}</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Phone */}
              <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-1">
                <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                  <Phone className="size-3.5" /> Phone Number
                </span>
                {user.phone ? (
                  <a
                    href={`tel:${user.phone}`}
                    className="block font-semibold text-foreground hover:text-primary transition-colors truncate"
                    dir="ltr"
                  >
                    {user.phone}
                  </a>
                ) : (
                  <span className="font-semibold text-muted-foreground">—</span>
                )}
              </div>

              {/* Email */}
              <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-1">
                <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                  <Mail className="size-3.5" /> Email
                </span>
                {user.email ? (
                  <a
                    href={`mailto:${user.email}`}
                    className="block font-semibold text-foreground hover:text-primary transition-colors truncate"
                  >
                    {user.email}
                  </a>
                ) : (
                  <span className="font-semibold text-muted-foreground">—</span>
                )}
              </div>



              {/* Updated At if exists */}
              {(user.updatedAt || user.updated_at) && (
                <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/10 p-3 space-y-1">
                  <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <Clock className="size-3.5" /> Last Updated
                  </span>
                  <span className="block font-medium text-foreground">
                    {formatDate(user.updatedAt || user.updated_at)}
                  </span>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 sm:justify-between gap-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              {onEdit && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit(user);
                  }}
                  className="gap-1.5"
                >
                  <Pencil className="size-3.5" />
                  Edit User
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailsDialog;
