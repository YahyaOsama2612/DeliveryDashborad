import { useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Shield,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import useGet from '../../hooks/useGet';
import useUpdate from '../../hooks/useUpdate';
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
import {
  extractUser,
  getErrorMessage,
  getRoleInfo,
  QUERY_KEY,
  ROLE_OPTIONS,
  USERS_URL,
} from './userUtils';

const EditUserForm = ({ userId, user, onCancel, onSuccess, updateMutation }) => {
  const [formData, setFormData] = useState(() => ({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'dispatcher',
    password: '',
  }));
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const role = formData.role;
    const password = formData.password.trim();

    if (!name) {
      setFormError('User name is required.');
      return;
    }

    if (!email) {
      setFormError('Email address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (!phone) {
      setFormError('Phone number is required.');
      return;
    }

    const payload = {
      name,
      email,
      phone,
      role,
    };

    if (password) {
      payload.password = password;
    }

    try {
      await updateMutation.mutateAsync({
        id: userId,
        payload,
      });
      toast.success(`User "${name}" updated successfully.`);
      onSuccess?.();
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to update user. Please try again.');
      setFormError(msg);
      toast.error(msg);
    }
  };

  const selectedRoleInfo = getRoleInfo(formData.role);
  const RoleIcon = selectedRoleInfo.icon;

  return (
    <>
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
        >
          <AlertCircle className="size-4 shrink-0 translate-y-0.5" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {/* Name Field */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-user-name" className="text-xs font-semibold">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="edit-user-name"
              placeholder="e.g. Omar"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="pl-9 h-9 text-sm"
              required
            />
          </div>
        </div>

        {/* Email Field */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-user-email" className="text-xs font-semibold">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="edit-user-email"
              type="email"
              placeholder="e.g. omar@gmail.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="pl-9 h-9 text-sm"
              required
            />
          </div>
        </div>

        {/* Phone Field */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-user-phone" className="text-xs font-semibold">
            Phone Number <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="edit-user-phone"
              type="tel"
              placeholder="e.g. 0123456"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="pl-9 h-9 text-sm"
              required
            />
          </div>
        </div>

        {/* Role Selection */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-user-role" className="text-xs font-semibold">
            Role & Permissions <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              id="edit-user-role"
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.description}
                </option>
              ))}
            </select>
          </div>

          {/* Role Info Helper Card */}
          <div className="mt-2 flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs">
            <RoleIcon className="size-4 shrink-0 text-primary mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">{selectedRoleInfo.label}</p>
              <p className="text-muted-foreground">{selectedRoleInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-user-password" className="text-xs font-semibold">
              Password{' '}
              <span className="text-xs font-normal text-muted-foreground">
                (leave it blank if you're not updating it)
              </span>
            </Label>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="edit-user-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="leave it blank if you're not updating it"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className="pl-9 pr-10 h-9 text-sm"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            leave it blank if you're not updating it
          </p>
        </div>

        <DialogFooter className="pt-2 sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={updateMutation.isPending}
            className="gap-1.5"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Pencil className="size-3.5" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
};

const EditUserDialog = ({ userId, user: initialUser, open, onOpenChange, onSuccess }) => {
  const singleUserUrl = userId ? `${USERS_URL}/${userId}` : '';
  const {
    data: fetchedData,
    loading: fetchingUser,
    error: fetchError,
    refetch,
  } = useGet(singleUserUrl, {}, Boolean(open && userId));

  const resolvedUser = extractUser(fetchedData) || initialUser || null;
  const updateMutation = useUpdate(USERS_URL, QUERY_KEY);

  const handleOpenChange = (nextOpen) => {
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Pencil className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Edit User</DialogTitle>
              <DialogDescription className="text-xs">
                Update account details and role permissions for ID: {userId || '—'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {fetchingUser && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
            <RefreshCw className="size-5 animate-spin text-primary" />
            <p className="text-xs">Fetching latest user data...</p>
          </div>
        )}

        {fetchError && !fetchingUser && !resolvedUser && (
          <div className="space-y-3 py-3">
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
            >
              <AlertCircle className="size-4 shrink-0 translate-y-0.5" />
              <span>{getErrorMessage(fetchError, 'Failed to load user details.')}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              Retry
            </Button>
          </div>
        )}

        {(!fetchingUser || resolvedUser) && resolvedUser && (
          <EditUserForm
            key={resolvedUser.id + (fetchedData ? '-fetched' : '-initial')}
            userId={userId}
            user={resolvedUser}
            onCancel={() => handleOpenChange(false)}
            onSuccess={() => {
              handleOpenChange(false);
              onSuccess?.();
            }}
            updateMutation={updateMutation}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
