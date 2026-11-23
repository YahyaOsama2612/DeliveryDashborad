import { useQuery } from '@tanstack/react-query';
import api from '../api';

/**
 * useGet — fetch data from a GET endpoint using React Query.
 * @param {string} url - The endpoint path (e.g. '/orders')
 * @param {object} [params] - Optional query params
 * @param {boolean} [enabled=true] - Whether the query is active
 */
const useGet = (url, params = {}, enabled = true) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [url, params],
    queryFn: () => api.get(url, { params }).then((res) => res.data),
    enabled,
  });

  return { data, loading: isLoading, error, refetch };
};

export default useGet;
