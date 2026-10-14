import { apiClient } from './client';
import { Pembanding } from '../types';

export const pembandingApi = {
  getAll: async (params?: Record<string, any>): Promise<Pembanding[]> => {
    const response = await apiClient.get<Pembanding[]>('/pembanding/', { params });
    return response.data;
  },

  create: async (data: Partial<Pembanding>): Promise<Pembanding> => {
    const response = await apiClient.post<Pembanding>('/pembanding/', data);
    return response.data;
  },

  importInternal: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/pembanding/import-internal', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
