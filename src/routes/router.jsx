import { createBrowserRouter } from 'react-router-dom';

import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';

import Login from '../pages/auth/Login';
import Home from '../pages/home/Home';
import Orders from '../pages/orders/Orders';
import OrderDetail from '../pages/orders/OrderDetail';
import Drivers from '../pages/drivers/Drivers';
import Zones from '../pages/zones/Zones';
import Restaurants from '../pages/restaurants/Restaurants';
import Users from '../pages/users/Users';
import Profile from '../pages/profile/Profile';
import Reports from '../pages/reports/Reports';
import NotFound from '../pages/NotFound';
import RouteErrorFallback from '../components/shared/RouteErrorFallback';

const router = createBrowserRouter([
  // ── Public routes ──────────────────────────────────
  {
    path: '/login',
    element: <Login />,
    errorElement: <RouteErrorFallback />,
  },

  // ── Protected routes (require auth) ───────────────
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/', element: <Home /> },
          { path: '/orders', element: <Orders /> },
          { path: '/orders/:id', element: <OrderDetail /> },
          { path: '/drivers', element: <Drivers /> },
          { path: '/delivery-men', element: <Drivers /> },
          { path: '/zones', element: <Zones /> },
          { path: '/restaurants', element: <Restaurants /> },
          { path: '/users', element: <Users /> },
          { path: '/reports', element: <Reports /> },
          { path: '/profile', element: <Profile /> },
        ],
      },
    ],
  },

  // ── Fallback ───────────────────────────────────────
  {
    path: '*',
    element: <NotFound />,
  },
]);

export default router;
