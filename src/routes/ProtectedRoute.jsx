import { Navigate, Outlet } from 'react-router-dom';

/**
 * ProtectedRoute — redirects to /login if the user is not authenticated.
 * Replace the `isAuthenticated` logic with your real auth check (e.g. context, token).
 */
const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  const isAuthenticated = Boolean(token);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
