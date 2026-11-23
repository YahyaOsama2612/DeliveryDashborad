import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

/**
 * useDelete — remove a resource via DELETE using React Query's useMutation.
 *
 * @param {string} baseUrl - The base endpoint path (e.g. '/orders')
 * @param {string|string[]} [queryKey] - Query key(s) to invalidate on success
 *
 * Usage:
 *   const { mutate: remove, isPending } = useDelete('/orders', 'orders');
 *   remove(123);           // DELETE /orders/123
 *   remove({ id: 123 });  // also supported
 */
const useDelete = (baseUrl, queryKey) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (idOrObj) => {
      const id = typeof idOrObj === 'object' ? idOrObj.id : idOrObj;
      return api.delete(`${baseUrl}/${id}`).then((res) => res.data);
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

export default useDelete;
