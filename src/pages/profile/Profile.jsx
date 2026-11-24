import { useState } from 'react';
import {
  BadgeCheck,
  Building2,
  Check,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Percent,
  Save,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import useGet from '../../hooks/useGet';
import useUpdate from '../../hooks/useUpdate';
import useAuthStore from '../../store/useAuthStore';
import getErrorMessage from '../../lib/Geterrormessage';
import ImageUpload from '../../components/shared/ImageUpload';
import { normalizeImageDataUrl } from '../../lib/imageUtils';

const PROFILE_URL = '/api/shipping/auth/profile';
const PROFILE_QUERY_KEY = [PROFILE_URL];
const profileFields = ['name', 'nameAr', 'phone', 'email', 'address'];
const fieldDetails = {
  name: { label: 'Company name', icon: Building2 },
  nameAr: { label: 'Arabic name', icon: Building2 },
  phone: { label: 'Phone number', icon: Phone },
  email: { label: 'Email address', icon: Mail },
  address: { label: 'Business address', icon: MapPin },
};

const Profile = () => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { data, loading, error } = useGet(PROFILE_URL);
  const updateProfile = useUpdate(PROFILE_URL, PROFILE_QUERY_KEY);
  const [logoUrl, setLogoUrl] = useState(null);
  const profile = data?.data?.data || user;
  const currentLogo = logoUrl ?? profile?.logo ?? '';
  const accountDetails = [
    { label: 'Account status', value: profile?.status || '—', icon: ShieldCheck },
    { label: 'Maximum active orders', value: profile?.maxActiveOrders ?? '—', icon: BadgeCheck },
    { label: 'Maximum search radius', value: profile?.maxSearchRadius ?? '—', icon: Search },
    {
      label: 'Commission',
      value: [profile?.commissionValue, profile?.commissionType].filter(Boolean).join(' ') || '—',
      icon: Percent,
    },
  ];

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = profileFields.reduce((fields, field) => {
      fields[field] = event.currentTarget.elements[field].value;
      return fields;
    }, {});
    payload.logo = normalizeImageDataUrl(currentLogo);

    try {
      const response = await updateProfile.mutateAsync(payload);
      const updatedProfile = response?.data?.data;
      const savedProfile = updatedProfile?.id
        ? updatedProfile
        : { ...profile, ...payload };
      setUser(
        savedProfile,
        token
      );
      if (typeof savedProfile.logo === 'string') {
        setLogoUrl(savedProfile.logo);
      }
    } catch {
      // The mutation error is rendered below.
    }
  };

  if (loading) {
    return (
      <div className="profile-state">
        <LoaderCircle className="size-5 animate-spin text-primary" />
        <span>Loading your company profile…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="profile-state profile-state-error">
        <ShieldCheck className="size-5" />
        <span>Could not load your profile: {getErrorMessage(error)}</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div role="alert" className="profile-state profile-state-error">
        <ShieldCheck className="size-5" />
        <span>The profile response did not contain profile details.</span>
      </div>
    );
  }

  return (
    <section className="profile-page mx-auto max-w-6xl">
      <div className="profile-page-heading">
        <div className="profile-eyebrow"><Building2 size={14} /> ACCOUNT SETTINGS</div>
        <h1>Company profile</h1>
        <p>Manage your business details and account preferences.</p>
      </div>

      <div className="profile-banner">
        <div className="profile-banner-orbit profile-banner-orbit-one" />
        <div className="profile-banner-orbit profile-banner-orbit-two" />
        <div className="profile-banner-identity">
          <div className="profile-emblem"><Building2 size={27} strokeWidth={1.7} /></div>
          <div className="min-w-0">
            <span className="profile-banner-kicker">BUSINESS ACCOUNT</span>
            <h2>{profile.name || 'Your company'}</h2>
            {profile.nameAr && <p dir="auto">{profile.nameAr}</p>}
            <span className="profile-account-chip">
              <span className="profile-chip-dot" />
              {profile.status || 'Company profile'}
            </span>
          </div>
        </div>
        <div className="profile-banner-mark" aria-hidden="true">
          <Building2 size={100} strokeWidth={0.8} />
        </div>
      </div>

      <dl className="profile-detail-grid">
        {accountDetails.map(({ label, value, icon: Icon }) => (
          <div className="profile-detail-card" key={label}>
            <span className="profile-detail-icon"><Icon size={18} /></span>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <form onSubmit={handleSubmit} className="profile-form-card">
        <div className="profile-form-heading">
          <span className="profile-form-icon"><UserRound size={19} /></span>
          <div>
            <h2>Company details</h2>
            <p>Keep your contact and business information up to date.</p>
          </div>
        </div>

        <div className="profile-fields-grid">
          {profileFields.map((field) => {
            const { label, icon: Icon } = fieldDetails[field];
            return (
              <label
                key={field}
                htmlFor={`profile-${field}`}
                className={`profile-field ${field === 'address' ? 'sm:col-span-2' : ''}`}
              >
                <span className="profile-field-label">{label}</span>
                <span className="profile-input-wrap">
                  <Icon className="profile-input-icon" size={16} aria-hidden="true" />
                  <input
                    id={`profile-${field}`}
                    name={field}
                    type={field === 'email' ? 'email' : 'text'}
                    required={field === 'name' || field === 'phone' || field === 'email'}
                    defaultValue={profile[field] ?? ''}
                    dir={field === 'nameAr' || field === 'address' ? 'auto' : undefined}
                    className="profile-input"
                  />
                </span>
              </label>
            );
          })}
        </div>

        <div className="profile-logo-section">
          <ImageUpload
            id="profile-logo"
            label="Company logo"
            description="Choose a logo, then save changes to upload it and use the hosted URL returned by the server."
            value={currentLogo}
            onChange={(newVal) => setLogoUrl(newVal)}
            shape="rounded"
            size="md"
          />
        </div>

        <div className="profile-form-footer">
          <div aria-live="polite">
            {updateProfile.isSuccess && (
              <p role="status" className="profile-save-success">
                <Check size={16} /> Profile updated successfully.
              </p>
            )}
            {updateProfile.isError && (
              <p role="alert" className="profile-save-error">
                Could not update your profile: {getErrorMessage(updateProfile.error)}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="profile-save-button"
          >
            {updateProfile.isPending
              ? <LoaderCircle size={16} className="animate-spin" />
              : <Save size={16} />}
            {updateProfile.isPending ? 'Saving changes…' : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default Profile;
