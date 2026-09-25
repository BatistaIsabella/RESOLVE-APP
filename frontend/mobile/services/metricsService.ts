import { api } from '@/lib/api';
import { MetricsKpis } from '@/types/demand';
import { ApiMetricsKpis, mapMetricsFromApi } from '@/utils/metricsMapper';

export const metricsService = {
  async getKpis(): Promise<MetricsKpis> {
    const { data } = await api.get<ApiMetricsKpis>('/metrics');
    return mapMetricsFromApi(data);
  },
};
