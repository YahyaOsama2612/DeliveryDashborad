import {
  Clock,
  CheckCircle2,
  Package,
  PackageCheck,
  Truck,
  XCircle,
  AlertCircle,
  Check,
} from 'lucide-react';

/**
 * Standardized status configurations for orders
 */
export const ORDER_STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    variant: 'amber',
    bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
    icon: Clock,
    stepIndex: 0,
  },
  confirmed: {
    label: 'Confirmed',
    variant: 'blue',
    bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    dot: 'bg-blue-500',
    icon: Check,
    stepIndex: 1,
  },
  accepted: {
    label: 'Accepted',
    variant: 'blue',
    bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    dot: 'bg-blue-500',
    icon: Check,
    stepIndex: 1,
  },
  preparing: {
    label: 'Preparing',
    variant: 'purple',
    bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    dot: 'bg-purple-500',
    icon: Package,
    stepIndex: 2,
  },
  in_preparation: {
    label: 'Preparing',
    variant: 'purple',
    bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    dot: 'bg-purple-500',
    icon: Package,
    stepIndex: 2,
  },
  ready: {
    label: 'Ready for Pickup',
    variant: 'cyan',
    bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    dot: 'bg-cyan-500',
    icon: PackageCheck,
    stepIndex: 2,
  },
  ready_for_pickup: {
    label: 'Ready for Pickup',
    variant: 'cyan',
    bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    dot: 'bg-cyan-500',
    icon: PackageCheck,
    stepIndex: 2,
  },
  picked_up: {
    label: 'Picked Up',
    variant: 'sky',
    bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    dot: 'bg-sky-500',
    icon: Truck,
    stepIndex: 3,
  },
  on_the_way: {
    label: 'Out for Delivery',
    variant: 'sky',
    bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    dot: 'bg-sky-500',
    icon: Truck,
    stepIndex: 3,
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    variant: 'sky',
    bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    dot: 'bg-sky-500',
    icon: Truck,
    stepIndex: 3,
  },
  delivered: {
    label: 'Delivered',
    variant: 'emerald',
    bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
    stepIndex: 4,
  },
  completed: {
    label: 'Completed',
    variant: 'emerald',
    bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
    stepIndex: 4,
  },
  canceled: {
    label: 'Canceled',
    variant: 'rose',
    bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    dot: 'bg-rose-500',
    icon: XCircle,
    stepIndex: -1,
  },
  cancelled: {
    label: 'Canceled',
    variant: 'rose',
    bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    dot: 'bg-rose-500',
    icon: XCircle,
    stepIndex: -1,
  },
  rejected: {
    label: 'Rejected',
    variant: 'rose',
    bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    dot: 'bg-rose-500',
    icon: XCircle,
    stepIndex: -1,
  },
};

export const getOrderStatusInfo = (status) => {
  if (!status) {
    return {
      label: 'Unknown',
      variant: 'muted',
      bg: 'bg-muted text-muted-foreground border-border',
      dot: 'bg-muted-foreground',
      icon: AlertCircle,
      stepIndex: 0,
    };
  }
  const normalized = String(status).toLowerCase().trim().replace(/[\s-]+/g, '_');
  return (
    ORDER_STATUS_CONFIG[normalized] || {
      label: status.charAt(0).toUpperCase() + status.slice(1),
      variant: 'muted',
      bg: 'bg-muted text-foreground border-border',
      dot: 'bg-muted-foreground',
      icon: Clock,
      stepIndex: 0,
    }
  );
};

export const formatCurrency = (amount, currency = 'EGP') => {
  if (amount == null || amount === '') return `0.00 ${currency}`;
  const num = Number(amount);
  if (isNaN(num)) return `${amount} ${currency}`;
  return `${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return String(dateStr);
  }
};

export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return '';
  }
};

/**
 * Normalizes an order item to ensure common fields are accessible
 */
export const normalizeOrder = (order) => {
  if (!order || typeof order !== 'object') return {};

  const id = order.id || order._id || order.orderId;
  const orderNumber =
    order.orderNumber ||
    order.order_number ||
    order.code ||
    order.orderCode ||
    (id ? `#${String(id).slice(-6).toUpperCase()}` : '#ORD-—');

  // Customer resolution
  const customer = order.customer || order.user || {};
  const customerName =
    customer.name ||
    order.customerName ||
    order.customer_name ||
    order.userName ||
    'Customer';
  const customerPhone =
    customer.phone ||
    order.customerPhone ||
    order.customer_phone ||
    order.userPhone ||
    '';
  const customerEmail =
    customer.email ||
    order.customerEmail ||
    order.customer_email ||
    '';

  // Restaurant resolution
  const restaurant = order.restaurant || {};
  const restaurantName =
    restaurant.name ||
    order.restaurantName ||
    order.restaurant_name ||
    'Restaurant';
  const restaurantNameAr =
    restaurant.nameAr ||
    order.restaurantNameAr ||
    '';
  const restaurantLogo =
    restaurant.logo ||
    order.restaurantLogo ||
    '';
  const restaurantPhone =
    restaurant.phone ||
    order.restaurantPhone ||
    '';
  const branchName =
    order.branch?.name ||
    order.branchName ||
    order.branch_name ||
    '';

  // Delivery Man resolution
  const deliveryMan =
    order.deliveryMan ||
    order.delivery_man ||
    order.driver ||
    (order.deliveryManId || order.driverId
      ? {
        id: order.deliveryManId || order.driverId,
        name: order.deliveryManName || order.driverName || 'Assigned Driver',
        phone: order.deliveryManPhone || order.driverPhone,
      }
      : null);

  const deliveryManId =
    deliveryMan?.id ||
    order.deliveryManId ||
    order.delivery_man_id ||
    order.driverId ||
    null;

  // Address resolution
  const addressObj =
    order.deliveryAddress ||
    order.delivery_address ||
    order.shippingAddress ||
    order.address ||
    customer.address ||
    {};

  const formattedAddress =
    typeof addressObj === 'string'
      ? addressObj
      : [
        addressObj.street || addressObj.streetName,
        addressObj.building && `Bldg ${addressObj.building}`,
        addressObj.floor && `Floor ${addressObj.floor}`,
        addressObj.apartment && `Apt ${addressObj.apartment}`,
        addressObj.zone || addressObj.area,
        addressObj.city,
      ]
        .filter(Boolean)
        .join(', ') ||
      order.addressText ||
      order.address_text ||
      'No address provided';

  // Items resolution
  const rawItems =
    order.items ||
    order.orderItems ||
    order.order_items ||
    order.products ||
    [];
  const items = Array.isArray(rawItems) ? rawItems : [];

  // Financials resolution
  const total =
    order.totalAmount ??
    order.total_amount ??
    order.total ??
    order.grandTotal ??
    order.price ??
    0;
  const subtotal =
    order.subtotal ??
    order.sub_total ??
    order.itemsTotal ??
    total;
  const deliveryFee =
    order.deliveryFee ??
    order.delivery_fee ??
    order.shippingCost ??
    0;
  const tax = order.tax ?? order.vat ?? 0;
  const discount = order.discount ?? 0;
  const currency =
    order.currency ||
    restaurant.currency ||
    'EGP';

  // Payment resolution
  const rawPaymentStatus = order.paymentStatus || order.payment_status;
  const paymentStatus = String(
    rawPaymentStatus || (order.isPaid ? 'paid' : 'unpaid')
  ).toLowerCase();

  const paymentMethod =
    order.paymentMethod ||
    order.payment_method ||
    order.paymentType ||
    'cash_on_delivery';

  // Status resolution
  const status = (order.status || 'pending').toLowerCase();

  const createdAt = order.createdAt || order.created_at || order.orderDate;
  const updatedAt = order.updatedAt || order.updated_at;
  const notes = order.notes || order.instructions || order.customerNotes || '';

  return {
    raw: order,
    id,
    orderNumber,
    status,
    customer: {
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
    },
    restaurant: {
      id: restaurant.id || order.restaurantId,
      name: restaurantName,
      nameAr: restaurantNameAr,
      logo: restaurantLogo,
      phone: restaurantPhone,
      branchName,
    },
    deliveryMan,
    deliveryManId,
    address: {
      text: formattedAddress,
      details: typeof addressObj === 'object' ? addressObj : {},
    },
    items,
    financials: {
      total,
      subtotal,
      deliveryFee,
      tax,
      discount,
      currency,
    },
    payment: {
      status: paymentStatus,
      method: paymentMethod,
    },
    createdAt,
    updatedAt,
    notes,
  };
};