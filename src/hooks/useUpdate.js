import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

/**
 * useUpdate — unified PUT mutation helper for the app.
 * Supports both direct endpoint updates and resource-id updates.
 *
 * @param {string} baseUrl - The endpoint path to update, e.g. '/orders' or '/profile'
 * @param {string|string[]} [queryKey] - Query key(s) to invalidate on success
 *
 * Usage:
 *   const updateMutation = useUpdate('/orders', 'orders');
 *   updateMutation.mutate({ id: 1, payload: { status: 'done' } });
 *   updateMutation.mutate({ payload: { name: 'A' }, customUrl: '/orders/custom' });
 *   updateMutation.mutate({ name: 'A' }); // sends PUT to '/orders' directly
 */
const useUpdate = (baseUrl, queryKey) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables) => {
      const payload = variables?.payload ?? variables;
      const id = variables?.id;
      const customUrl = variables?.customUrl;
      const url =
        customUrl ||
        (id !== undefined && id !== null && baseUrl ? `${baseUrl}/${id}` : baseUrl);

      return api.put(url, payload).then((res) => res.data);
    },
    onSuccess: () => {
      if (queryKey) {
        queryClient.invalidateQueries({
          queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
        });
      }
    },
  });
};

export default useUpdate;
