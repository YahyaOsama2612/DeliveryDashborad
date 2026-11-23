import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * useAuthStore — manages authentication state (user, token, logout).
 *
 * The token is stored in localStorage under the plain 'token' key
 * (this is what the axios interceptor in api.js reads).
 * The user object is persisted by zustand under 'auth-storage'.
 */
const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      // Restore the token on page refresh straight from localStorage
      token: localStorage.getItem('token'),

      /** Call this after a successful login API response */
      setUser: (user, token) => {
        if (token) localStorage.setItem('token', token);
        set({ user, token });
      },

      /** Clears auth state and removes token from localStorage */
      setLogout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth-storage', // localStorage key for the persisted user
      // Don't persist the token here; 'token' in localStorage is the single source of truth
      partialize: (state) => ({ user: state.user }),
    }
  )
);

export default useAuthStore;