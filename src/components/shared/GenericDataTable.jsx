import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import api from '../../api';
import useDelete from '../../hooks/useDelete';
import getErrorMessage from '../../lib/Geterrormessage';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50];

const GenericDataTable = ({
  columns = [],
  data = [],
  title,
  onAdd,
  onEdit,
  editApiUrl,
  deleteApiUrl,
  queryKey,
  isLoading = false,
  actions = true,
  highlightedId,
  inactiveStatusValue = 'inactive',
  serverPagination,
  onPageChange,
  onLimitChange,
  onSearch,
  sortByDate = true,
}) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [deleteRow, setDeleteRow] = useState(null);
  const queryClient = useQueryClient();
  const deleteMutation = useDelete(deleteApiUrl || '', queryKey);
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.put(`${editApiUrl}/${id}`, { status }),
    onSuccess: () => {
      if (queryKey) {
        queryClient.invalidateQueries({
          queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
        });
      }
    },
  });

  const isServerPaginated = Boolean(serverPagination);
  const currentPage = isServerPaginated
    ? Math.max(1, serverPagination.page || 1)
    : pageIndex + 1;
  const currentPageSize = isServerPaginated
    ? serverPagination.limit || pageSize
    : pageSize;

  const filteredData = useMemo(() => {
    const rows = Array.isArray(data) ? [...data] : [];
    if (sortByDate) {
      rows.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
    }

    const search = globalFilter.trim().toLowerCase();
    if (!search || isServerPaginated) return rows;

    return rows.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? '').toLowerCase().includes(search)
      )
    );
  }, [data, globalFilter, isServerPaginated, sortByDate]);

  const totalPages = isServerPaginated
    ? Math.max(1, serverPagination.totalPages || 1)
    : Math.max(1, Math.ceil(filteredData.length / pageSize));
  const visibleRows = isServerPaginated
    ? filteredData
    : filteredData.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const changePage = (nextPage) => {
    const boundedPage = Math.min(Math.max(nextPage, 1), totalPages);
    if (isServerPaginated) {
      onPageChange?.(boundedPage);
    } else {
      setPageIndex(boundedPage - 1);
    }
  };

  const changePageSize = (event) => {
    const nextPageSize = Number(event.target.value);
    if (isServerPaginated) {
      onLimitChange?.(nextPageSize);
    } else {
      setPageSize(nextPageSize);
      setPageIndex(0);
    }
  };

  const renderCell = (column, row, rowIndex) => {
    const value = row[column.accessorKey ?? column.id];
    if (column.cell) {
      return column.cell({
        row: {
          original: row,
          index: rowIndex,
          getValue: (key) => row[key ?? column.accessorKey ?? column.id],
        },
        getValue: () => value,
        column,
      });
    }
    return value == null ? '—' : String(value);
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deleteRow.id);
      setDeleteRow(null);
    } catch {
      // The mutation error is shown in the confirmation dialog.
    }
  };

  const handleSearch = (event) => {
    const value = event.target.value;
    setGlobalFilter(value);
    if (isServerPaginated) {
      onSearch?.(value);
    } else {
      setPageIndex(0);
    }
  };

  return (
    <section className="w-full space-y-5">
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-lg font-bold text-primary">
            {title?.[0] || 'D'}
          </div>
          <div>
            <h2 className="m-0 text-xl font-bold tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground">
              Manage and monitor {title}
              {isServerPaginated && typeof serverPagination.total === 'number'
                ? ` · ${serverPagination.total.toLocaleString()} total`
                : ''}
            </p>
          </div>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label={`Search ${title || 'table'}`}
              placeholder={isServerPaginated ? 'Search this page...' : 'Search...'}
              value={globalFilter}
              onChange={handleSearch}
              className="h-10 pl-9"
            />
          </div>
          {onAdd && (
            <Button onClick={onAdd} className="h-10 shrink-0">
              <Plus />
              <span>Add New</span>
            </Button>
          )}
        </div>
      </div>

      {(statusMutation.isError || deleteMutation.isError) && (
        <p role="alert" className="text-sm text-destructive">
          {statusMutation.isError
            ? `Could not update status: ${getErrorMessage(statusMutation.error)}`
            : `Could not delete item: ${getErrorMessage(deleteMutation.error)}`}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-14 text-center">#</TableHead>
              {columns.map((column) => (
                <TableHead key={column.id || column.accessorKey} className="text-center">
                  {typeof column.header === 'function'
                    ? column.header({ column })
                    : column.header}
                </TableHead>
              ))}
              {actions && (onEdit || deleteApiUrl) && (
                <TableHead className="text-center">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1 + Number(actions && (onEdit || deleteApiUrl))}
                  className="h-40 text-center text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : visibleRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1 + Number(actions && (onEdit || deleteApiUrl))}
                  className="h-40 text-center text-muted-foreground"
                >
                  No data found
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row, rowIndex) => (
                <TableRow
                  key={row.id ?? rowIndex}
                  className={
                    row.id === highlightedId ? 'bg-primary/10 font-medium' : ''
                  }
                >
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {(currentPage - 1) * currentPageSize + rowIndex + 1}
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell
                      key={column.id || column.accessorKey}
                      className="text-center"
                    >
                      {column.accessorKey === 'status' && editApiUrl ? (
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={
                              row.status === 'active' ||
                              row.status === 'paid' ||
                              row.status === true ||
                              row.status === 1
                            }
                            disabled={statusMutation.isPending}
                            onCheckedChange={(checked) => {
                              const nextStatus =
                                typeof row.status === 'string'
                                  ? row.status === 'paid' || row.status === 'unpaid'
                                    ? checked
                                      ? 'paid'
                                      : 'unpaid'
                                    : checked
                                      ? 'active'
                                      : inactiveStatusValue
                                  : checked;
                              statusMutation.mutate({
                                id: row.id,
                                status: nextStatus,
                              });
                            }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {row.status === 'active' ||
                            row.status === 'paid' ||
                            row.status === true ||
                            row.status === 1
                              ? 'Active'
                              : 'Inactive'}
                          </span>
                        </div>
                      ) : (
                        renderCell(column, row, rowIndex)
                      )}
                    </TableCell>
                  ))}
                  {actions && (onEdit || deleteApiUrl) && (
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        {onEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit row ${row.id ?? rowIndex + 1}`}
                            onClick={() => onEdit(row)}
                          >
                            <Pencil />
                          </Button>
                        )}
                        {deleteApiUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete row ${row.id ?? rowIndex + 1}`}
                            onClick={() => setDeleteRow(row)}
                          >
                            <Trash2 className="text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
          {!isServerPaginated && ` · ${filteredData.length} items`}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="table-page-size" className="text-sm text-muted-foreground">
            Rows
          </label>
          <select
            id="table-page-size"
            value={currentPageSize}
            onChange={changePageSize}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous page"
            disabled={currentPage <= 1}
            onClick={() => changePage(currentPage - 1)}
          >
            <ArrowLeft />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next page"
            disabled={currentPage >= totalPages}
            onClick={() => changePage(currentPage + 1)}
          >
            <ArrowRight />
          </Button>
        </div>
      </div>

      <Dialog
        open={Boolean(deleteRow)}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteRow(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this item?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The item will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {getErrorMessage(deleteMutation.error, 'Could not delete this item.')}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteRow(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default GenericDataTable;
