import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

/**
 * usePost — send data via POST using React Query's useMutation.
 * @param {string} url - The endpoint path (e.g. '/orders')
 * @param {string} [method='post'] - HTTP method override
 * @param {string|string[]} [queryKey] - Query key(s) to invalidate on success
 */
const usePost = (url, method = 'post', queryKey) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) =>
      api[method](url, payload).then((res) => res.data),
    onSuccess: () => {
      if (queryKey) {
        queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
      }
    },
  });
};

export default usePost;
