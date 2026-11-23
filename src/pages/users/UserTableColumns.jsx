import { Calendar, Eye, Phone } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { formatDate, getRoleInfo } from './userUtils';

const UserNameCell = ({ user, onShowDetails }) => {
  const initials = (user?.name || 'U')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 text-left">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-bold text-primary shadow-2xs">
        {initials}
      </div>
      <div className="flex flex-col min-w-0">
        <button
          type="button"
          onClick={() => onShowDetails?.(user.id)}
          className="truncate text-left font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
          title="Click to view details"
        >
          {user.name || 'Unnamed User'}
        </button>
        <span className="truncate text-xs text-muted-foreground">{user.email || '—'}</span>
      </div>
    </div>
  );
};

const UserRoleBadge = ({ role }) => {
  const roleInfo = getRoleInfo(role);
  const Icon = roleInfo.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-2xs ${roleInfo.badgeClass}`}
    >
      <span className={`size-1.5 rounded-full ${roleInfo.dotClass}`} />
      <Icon className="size-3" />
      <span>{roleInfo.label}</span>
    </span>
  );
};

export const UserTableColumns = ({ onShowDetails }) => [
  {
    id: 'user',
    header: 'User',
    cell: ({ row }) => (
      <UserNameCell user={row.original} onShowDetails={onShowDetails} />
    ),
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => {
      const phone = row.original.phone;
      if (!phone) return <span className="text-muted-foreground">—</span>;
      return (
        <a
          href={`tel:${phone}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary transition-colors"
          dir="ltr"
        >
          <Phone className="size-3 text-muted-foreground" />
          <span>{phone}</span>
        </a>
      );
    },
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => <UserRoleBadge role={row.original.role} />,
  },
  {
    id: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Calendar className="size-3" />
        {formatDate(row.original.createdAt || row.original.created_at)}
      </span>
    ),
  },
  {
    id: 'viewDetails',
    header: 'Details',
    cell: ({ row }) => (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => onShowDetails?.(row.original.id)}
        aria-label={`View details for ${row.original.name || 'user'}`}
      >
        <Eye className="size-3.5" />
        <span>View</span>
      </Button>
    ),
  },
];

export default UserTableColumns;
