import { MapPinned, Package, Store, Truck, Users } from 'lucide-react';

export const navigationItems = [
  {
    title: 'Orders',
    description: 'View and manage delivery orders',
    url: '/orders',
    icon: Package,
  },
  {
    title: 'Delivery Man',
    description: 'Manage your delivery drivers',
    url: '/delivery-men',
    icon: Truck,
  },
  {
    title: 'Zones',
    description: 'View and manage delivery zones',
    url: '/zones',
    icon: MapPinned,
  },
  {
    title: 'Restaurants',
    description: 'View and manage restaurants',
    url: '/restaurants',
    icon: Store,
  },
  {
    title: 'Users',
    description: 'Manage admins, dispatchers & viewers',
    url: '/users',
    icon: Users,
  },
];
