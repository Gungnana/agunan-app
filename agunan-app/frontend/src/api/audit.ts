import { apiClient } from './client';
import { AuditLog } from '../types';

export const auditApi = {
  getLogs: async (params?: Record<string, any>): Promise<AuditLog[]> => {
    const response = await apiClient.get<AuditLog[]>('/audit/', { params });
    return response.data;
  },
};
