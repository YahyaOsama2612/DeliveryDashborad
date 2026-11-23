/**
 * hasModulePermission — checks if a user can access a given module.
 *
 * @param {object|null} user       - The authenticated user from useAuthStore
 * @param {string}      moduleName - The module identifier string (e.g. "Orders")
 * @returns {boolean}
 */
export const hasModulePermission = (user, moduleName) => {
  // Not logged in → deny
  if (!user) return false;

  // Superadmins always have full access
  if (user.role === 'superadmin' || user.isSuperAdmin) return true;

  // If no permissions array → allow all (dev mode / fallback)
  if (!user.permissions || user.permissions.length === 0) return true;

  // Check if any permission entry matches the module name (case-insensitive)
  return user.permissions.some(
    (p) =>
      (p.module || p.name || p)?.toLowerCase() === moduleName?.toLowerCase()
  );
};
