import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Eye,
  Plus,
  Radio,
  RefreshCw,
  ShieldCheck,
  Users as UsersIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import useGet from '../../hooks/useGet';
import GenericDataTable from '../../components/shared/GenericDataTable';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import CreateUserDialog from './CreateUserDialog';
import EditUserDialog from './EditUserDialog';
import UserDetailsDialog from './UserDetailsDialog';
import UserTableColumns from './UserTableColumns';
import {
  extractUsersList,
  getErrorMessage,
  QUERY_KEY,
  USERS_URL,
} from './userUtils';

const Users = () => {
  const { data, loading, error, refetch } = useGet(USERS_URL);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');

  // Extract users list safely
  const users = useMemo(() => {
    return extractUsersList(data);
  }, [data]);

  // Role-based counts
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => (u.role || '').toLowerCase() === 'admin').length;
    const dispatchers = users.filter((u) => (u.role || '').toLowerCase() === 'dispatcher').length;
    const viewers = users.filter((u) => (u.role || '').toLowerCase() === 'viewer').length;

    return { total, admins, dispatchers, viewers };
  }, [users]);

  // Filtered users according to selected role tab
  const filteredUsers = useMemo(() => {
    if (roleFilter === 'all') return users;
    return users.filter((u) => (u.role || '').toLowerCase() === roleFilter);
  }, [users, roleFilter]);

  // Table columns definition
  const columns = useMemo(
    () =>
      UserTableColumns({
        onShowDetails: (id) => setSelectedUserId(id),
      }),
    []
  );

  const handleEdit = (userOrRow) => {
    const candidate = userOrRow?.original ?? userOrRow;
    if (!candidate?.id) {
      toast.error('Unable to edit: user ID is missing.');
      return;
    }
    setEditingUser(candidate);
    setIsEditOpen(true);
  };

  return (
    <section className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Users & Staff
            </h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {users.length} Total
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Manage company administrators, dispatchers, and viewer accounts for shipping operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
            className="h-9 gap-1.5"
            title="Refresh user list"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-9 gap-1.5 shadow-sm"
          >
            <Plus className="size-4" />
            <span>Add User</span>
          </Button>
        </div>
      </div>

      {/* Error state banner */}
      {error && !loading && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive sm:text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>Failed to load users: {getErrorMessage(error, 'Unknown error occurred.')}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="shrink-0 border-destructive/30 bg-background text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className="size-3.5 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Total Users */}
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setRoleFilter('all')}
          className={`cursor-pointer transition-all border ${
            roleFilter === 'all'
              ? 'border-primary ring-1 ring-primary shadow-sm bg-primary/5'
              : 'hover:border-border/80'
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Users</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UsersIcon className="size-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">{stats.total}</span>
              <span className="text-[11px] text-muted-foreground">Registered</span>
            </div>
          </CardContent>
        </Card>

        {/* Admins */}
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setRoleFilter('admin')}
          className={`cursor-pointer transition-all border ${
            roleFilter === 'admin'
              ? 'border-purple-500 ring-1 ring-purple-500 shadow-sm bg-purple-500/5'
              : 'hover:border-border/80'
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Admins</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <ShieldCheck className="size-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-purple-700 dark:text-purple-300">
                {stats.admins}
              </span>
              <span className="text-[11px] text-muted-foreground">Full Access</span>
            </div>
          </CardContent>
        </Card>

        {/* Dispatchers */}
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setRoleFilter('dispatcher')}
          className={`cursor-pointer transition-all border ${
            roleFilter === 'dispatcher'
              ? 'border-sky-500 ring-1 ring-sky-500 shadow-sm bg-sky-500/5'
              : 'hover:border-border/80'
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Dispatchers</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Radio className="size-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-sky-700 dark:text-sky-300">
                {stats.dispatchers}
              </span>
              <span className="text-[11px] text-muted-foreground">Dispatch & Ops</span>
            </div>
          </CardContent>
        </Card>

        {/* Viewers */}
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setRoleFilter('viewer')}
          className={`cursor-pointer transition-all border ${
            roleFilter === 'viewer'
              ? 'border-emerald-500 ring-1 ring-emerald-500 shadow-sm bg-emerald-500/5'
              : 'hover:border-border/80'
          }`}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Viewers</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Eye className="size-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                {stats.viewers}
              </span>
              <span className="text-[11px] text-muted-foreground">Read Only</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role filter tab pills */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-3">
        <span className="text-xs font-semibold text-muted-foreground mr-1">Filter Role:</span>
        <button
          type="button"
          onClick={() => setRoleFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            roleFilter === 'all'
              ? 'bg-primary text-primary-foreground shadow-2xs'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          All Roles ({stats.total})
        </button>
        <button
          type="button"
          onClick={() => setRoleFilter('admin')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            roleFilter === 'admin'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20'
          }`}
        >
          Admins ({stats.admins})
        </button>
        <button
          type="button"
          onClick={() => setRoleFilter('dispatcher')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            roleFilter === 'dispatcher'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20'
          }`}
        >
          Dispatchers ({stats.dispatchers})
        </button>
        <button
          type="button"
          onClick={() => setRoleFilter('viewer')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            roleFilter === 'viewer'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
          }`}
        >
          Viewers ({stats.viewers})
        </button>
      </div>

      {/* Main Data Table */}
      <GenericDataTable
        title="Users"
        data={filteredUsers}
        columns={columns}
        isLoading={loading}
        onAdd={() => setIsCreateOpen(true)}
        onEdit={handleEdit}
        editApiUrl={USERS_URL}
        deleteApiUrl={USERS_URL}
        queryKey={QUERY_KEY}
        sortByDate={true}
      />

      {/* Create User Dialog */}
      <CreateUserDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => refetch()}
      />

      {/* Edit User Dialog */}
      {isEditOpen && (
        <EditUserDialog
          key={editingUser?.id ?? 'edit-user'}
          userId={editingUser?.id}
          user={editingUser}
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) setEditingUser(null);
          }}
          onSuccess={() => refetch()}
        />
      )}

      {/* User Details Dialog */}
      {selectedUserId && (
        <UserDetailsDialog
          key={selectedUserId}
          userId={selectedUserId}
          open={Boolean(selectedUserId)}
          onOpenChange={(open) => {
            if (!open) setSelectedUserId(null);
          }}
          onEdit={(user) => {
            setSelectedUserId(null);
            setEditingUser(user);
            setIsEditOpen(true);
          }}
        />
      )}
    </section>
  );
};

export default Users;
