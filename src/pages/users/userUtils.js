import { Eye, Radio, ShieldCheck, User } from 'lucide-react';
import getErrorMessage from '../../lib/Geterrormessage';

export const USERS_URL = '/api/shipping/users';
export const QUERY_KEY = [USERS_URL];

export const ROLE_CONFIG = {
  admin: {
    key: 'admin',
    label: 'Admin',
    description: 'Full administrative access to manage users, orders, delivery men, and settings.',
    badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25',
    dotClass: 'bg-purple-500',
    icon: ShieldCheck,
  },
  dispatcher: {
    key: 'dispatcher',
    label: 'Dispatcher',
    description: 'Operational control to dispatch orders, assign drivers, and monitor deliveries.',
    badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
    dotClass: 'bg-sky-500',
    icon: Radio,
  },
  viewer: {
    key: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to view shipments, delivery status, and reports without editing.',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    dotClass: 'bg-emerald-500',
    icon: Eye,
  },
};

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', description: 'Full administration & user management' },
  { value: 'dispatcher', label: 'Dispatcher', description: 'Dispatch orders & manage drivers' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only visibility' },
];

/**
 * Normalizes a user object so it always has an `id` field.
 */
export const withUserId = (user) => {
  if (!user || typeof user !== 'object') return user;
  const id = user.id ?? user._id ?? user.userId;
  return {
    ...user,
    id: id !== undefined && id !== null ? String(id) : undefined,
  };
};

/**
 * Safely extracts a list of users from multiple common API response shapes.
 */
export const extractUsersList = (response) => {
  if (!response) return [];

  const rawList =
    response?.data?.data ||
    response?.data?.users ||
    response?.users ||
    (Array.isArray(response?.data) ? response?.data : null) ||
    (Array.isArray(response) ? response : []);

  if (!Array.isArray(rawList)) return [];

  return rawList.map(withUserId).filter((u) => u && u.id);
};

/**
 * Safely extracts a single user object from an API response.
 */
export const extractUser = (response) => {
  if (!response) return null;

  const raw =
    response?.data?.data ||
    response?.data?.user ||
    (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
      ? response.data
      : null) ||
    response?.user ||
    (typeof response === 'object' && !Array.isArray(response) ? response : null);

  return raw ? withUserId(raw) : null;
};

/**
 * Formats date into a user-friendly format (e.g., Oct 18, 2026, 03:00 PM).
 */
export const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return String(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateString);
  }
};

/**
 * Gets role presentation info with fallback.
 */
export const getRoleInfo = (role) => {
  const normalized = (role || '').toLowerCase().trim();
  return (
    ROLE_CONFIG[normalized] || {
      key: normalized || 'user',
      label: normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'User',
      description: 'Account member',
      badgeClass: 'bg-muted text-muted-foreground border-border',
      dotClass: 'bg-muted-foreground',
      icon: User,
    }
  );
};

export { getErrorMessage };
