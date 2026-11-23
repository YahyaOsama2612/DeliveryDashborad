import { useState } from 'react';
import useGet from '../../hooks/useGet';
import useUpdate from '../../hooks/useUpdate';
import useAuthStore from '../../store/useAuthStore';
import getErrorMessage from '../../lib/Geterrormessage';
import ImageUpload from '../../components/shared/ImageUpload';

const PROFILE_URL = '/api/shipping/auth/profile';
const PROFILE_QUERY_KEY = [PROFILE_URL];
const profileFields = ['name', 'nameAr', 'phone', 'email', 'address'];

const Profile = () => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { data, loading, error } = useGet(PROFILE_URL);
  const updateProfile = useUpdate(PROFILE_URL, PROFILE_QUERY_KEY);
  const [logoUrl, setLogoUrl] = useState(null);
  const profile = data?.data?.data || user;
  const currentLogo = logoUrl ?? profile?.logo ?? '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = profileFields.reduce((fields, field) => {
      fields[field] = event.currentTarget.elements[field].value;
      return fields;
    }, {});
    payload.logo = currentLogo;

    try {
      const response = await updateProfile.mutateAsync(payload);
      const updatedProfile = response?.data?.data;
      setUser(
        updatedProfile?.id ? updatedProfile : { ...profile, ...payload },
        token
      );
    } catch {
      // The mutation error is rendered below.
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Could not load your profile: {getErrorMessage(error)}
      </p>
    );
  }

  if (!profile) {
    return (
      <p role="alert" className="text-sm text-destructive">
        The profile response did not contain profile details.
      </p>
    );
  }

  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <h2 className="m-0 text-xl font-semibold tracking-tight">Company profile</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          View and update your shipping company account details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
        {profileFields.map((field) => (
          <label
            key={field}
            htmlFor={`profile-${field}`}
            className={`block space-y-2 text-sm font-medium ${
              field === 'address' ? 'sm:col-span-2' : ''
            }`}
          >
            {field === 'nameAr'
              ? 'Arabic name'
              : field.charAt(0).toUpperCase() + field.slice(1)}
            <input
              id={`profile-${field}`}
              name={field}
              type={field === 'email' ? 'email' : 'text'}
              required={field === 'name' || field === 'phone' || field === 'email'}
              defaultValue={profile[field] ?? ''}
              dir={field === 'nameAr' || field === 'address' ? 'auto' : undefined}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        ))}

        <div className="sm:col-span-2">
          <ImageUpload
            id="profile-logo"
            label="Company Logo"
            description="Upload your company logo. It is converted to a link automatically and displayed across the dashboard."
            value={currentLogo}
            onChange={(newVal) => setLogoUrl(newVal)}
            shape="rounded"
            size="md"
          />
        </div>

        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:brightness-95 disabled:pointer-events-none disabled:opacity-60"
          >
            {updateProfile.isPending ? 'Saving…' : 'Save changes'}
          </button>
          {updateProfile.isSuccess && (
            <p role="status" className="text-sm text-green-700">
              Profile updated successfully.
            </p>
          )}
          {updateProfile.isError && (
            <p role="alert" className="text-sm text-destructive">
              Could not update your profile: {getErrorMessage(updateProfile.error)}
            </p>
          )}
        </div>
      </form>

      <dl className="grid gap-4 mb-4 rounded-lg border bg-card p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="mt-1 font-medium">{profile.status || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Maximum active orders</dt>
          <dd className="mt-1 font-medium">{profile.maxActiveOrders ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Maximum search radius</dt>
          <dd className="mt-1 font-medium">{profile.maxSearchRadius ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Commission</dt>
          <dd className="mt-1 font-medium">
            {profile.commissionValue ?? '—'} ({profile.commissionType || '—'})
          </dd>
        </div>
      </dl>
    </section>
  );
};

export default Profile;
