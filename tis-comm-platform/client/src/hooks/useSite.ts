import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Site } from '../types';

export function useSite(code: string | undefined) {
  return useQuery({
    queryKey: ['site', code],
    enabled: !!code,
    queryFn: async () => {
      const { data } = await api.get<{ site: Site }>(`/sites/${code}`);
      return data.site;
    },
  });
}

export function useMySites() {
  return useQuery({
    queryKey: ['sites', 'mine'],
    queryFn: async () => {
      const { data } = await api.get<{ sites: Site[] }>('/sites');
      return data.sites;
    },
  });
}
