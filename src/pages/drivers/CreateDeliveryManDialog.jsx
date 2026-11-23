import { useState, useMemo } from 'react';
import {
  Eye,
  EyeOff,
  Loader2,
  User,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import useGet from '../../hooks/useGet';
import usePost from '../../hooks/usePost';
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

const RESTAURANTS_URL = '/api/shipping/restaurants';
const CREATE_DELIVERY_MAN_URL = '/api/shipping/delivery-men';

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

const CreateDeliveryManDialog = ({ open, onOpenChange, onSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    image: '',
    deliveryType: 'outsource',
    shiftStatus: 'inactive',
    restaurantId: '',
    branchId: '',
  });
  const [formError, setFormError] = useState('');

  // Fetch available restaurants
  const {
    data: restaurantsData,
    loading: loadingRestaurants,
    error: restaurantsError,
    refetch: refetchRestaurants,
  } = useGet(RESTAURANTS_URL, {}, open);

  const restaurants = useMemo(() => {
    const rawList =
      restaurantsData?.data?.data ||
      (Array.isArray(restaurantsData?.data) ? restaurantsData?.data : []);
    return Array.isArray(rawList) ? rawList : [];
  }, [restaurantsData]);

  // Fetch branches when a restaurant is selected
  const branchesUrl = formData.restaurantId
    ? `/api/shipping/restaurants/${formData.restaurantId}/branches`
    : null;

  const {
    data: branchesData,
    loading: loadingBranches,
    error: branchesError,
    refetch: refetchBranches,
  } = useGet(branchesUrl || '', {}, Boolean(formData.restaurantId && open));

  const branches = useMemo(() => {
    const rawList =
      branchesData?.data?.data ||
      (Array.isArray(branchesData?.data) ? branchesData?.data : []);
    return Array.isArray(rawList) ? rawList : [];
  }, [branchesData]);

  const createMutation = usePost(
    CREATE_DELIVERY_MAN_URL,
    'post',
    [CREATE_DELIVERY_MAN_URL]
  );

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // If restaurant changed, reset branchId
      if (field === 'restaurantId') {
        updated.branchId = '';
      }
      return updated;
    });
    setFormError('');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      password: '',
      image: '',
      deliveryType: 'outsource',
      shiftStatus: 'inactive',
      restaurantId: '',
      branchId: '',
    });
    setFormError('');
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.restaurantId) {
      setFormError('Please select a restaurant.');
      return;
    }
    if (!formData.branchId) {
      setFormError('Please select a branch.');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('Phone number is required.');
      return;
    }
    if (!formData.email.trim()) {
      setFormError('Email is required.');
      return;
    }
    if (!formData.password.trim()) {
      setFormError('Password is required.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      password: formData.password,
      image: formData.image.trim() || undefined,
      deliveryType: formData.deliveryType,
      shiftStatus: formData.shiftStatus,
      restaurantId: formData.restaurantId,
      branchId: formData.branchId,
    };

    try {
      await createMutation.mutateAsync(payload);
      toast.success('Delivery man created successfully!');
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to register delivery man.');
      setFormError(msg);
      toast.error(msg);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="border-b border-border/70 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <User className="size-5 text-primary" />
            <span>Register New Delivery Man</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Create a new delivery driver assigned to a restaurant branch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
          {formError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Restaurant & Branch selection */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="restaurantId" className="text-xs font-semibold">
                Restaurant <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <select
                  id="restaurantId"
                  value={formData.restaurantId}
                  onChange={(e) => handleChange('restaurantId', e.target.value)}
                  disabled={loadingRestaurants}
                  className={selectClassName}
                  required
                >
                  <option value="">
                    {loadingRestaurants ? 'Loading restaurants...' : 'Select Restaurant'}
                  </option>
                  {restaurants.map((rest) => (
                    <option key={rest.id} value={rest.id}>
                      {rest.name} {rest.nameAr ? `(${rest.nameAr})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {restaurantsError && (
                <QueryErrorNotice
                  error={restaurantsError}
                  onRetry={refetchRestaurants}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branchId" className="text-xs font-semibold">
                Branch <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <select
                  id="branchId"
                  value={formData.branchId}
                  onChange={(e) => handleChange('branchId', e.target.value)}
                  disabled={!formData.restaurantId || loadingBranches}
                  className={selectClassName}
                  required
                >
                  <option value="">
                    {!formData.restaurantId
                      ? 'Select restaurant first'
                      : loadingBranches
                        ? 'Loading branches...'
                        : branches.length === 0
                          ? 'No branches available'
                          : 'Select Branch'}
                  </option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.nameAr ? `(${b.nameAr})` : ''}
                    </option>
                  ))}
                </select>
              </div>
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
              <Label htmlFor="name" className="text-xs font-semibold">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="name"
                  placeholder="e.g. Ahmed Ali"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g. +201234567890"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Email & Password */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="ahmed@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold">
                Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Secure password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className="pr-9"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
              <Label htmlFor="deliveryType" className="text-xs font-semibold">
                Delivery Type
              </Label>
              <select
                id="deliveryType"
                value={formData.deliveryType}
                onChange={(e) => handleChange('deliveryType', e.target.value)}
                className={selectClassName}
              >
                <option value="outsource">Outsource</option>
                <option value="restaurant">Restaurant</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shiftStatus" className="text-xs font-semibold">
                Shift Status
              </Label>
              <select
                id="shiftStatus"
                value={formData.shiftStatus}
                onChange={(e) => handleChange('shiftStatus', e.target.value)}
                className={selectClassName}
              >
                <option value="inactive">Inactive</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>

          {/* Profile Image URL */}
          <div className="space-y-1.5">
            <Label htmlFor="image" className="text-xs font-semibold">
              Profile Image URL (Optional)
            </Label>
            <Input
              id="image"
              type="url"
              placeholder="https://example.com/images/ahmed.jpg"
              value={formData.image}
              onChange={(e) => handleChange('image', e.target.value)}
            />
          </div>

          <DialogFooter className="border-t border-border/70 pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="gap-1.5"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <User className="size-4" />
                  <span>Create Delivery Man</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDeliveryManDialog;