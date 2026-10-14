import { apiClient } from './client';
import { Pengajuan, Agunan } from '../types';

export const pengajuanApi = {
  getAll: async (): Promise<Pengajuan[]> => {
    const response = await apiClient.get<Pengajuan[]>('/pengajuan/');
    return response.data;
  },

  getById: async (id: number): Promise<Pengajuan> => {
    const response = await apiClient.get<Pengajuan>(`/pengajuan/${id}`);
    return response.data;
  },

  create: async (data: Partial<Pengajuan>): Promise<Pengajuan> => {
    const response = await apiClient.post<Pengajuan>('/pengajuan/', data);
    return response.data;
  },
};

export const agunanApi = {
  getByPengajuanId: async (pengajuanId: number): Promise<Agunan[]> => {
    const response = await apiClient.get<Agunan[]>(`/agunan/?pengajuan_id=${pengajuanId}`);
    return response.data;
  },

  getById: async (id: number): Promise<Agunan> => {
    const response = await apiClient.get<Agunan>(`/agunan/${id}`);
    return response.data;
  },

  create: async (data: Partial<Agunan>): Promise<Agunan> => {
    const response = await apiClient.post<Agunan>('/agunan/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Agunan>): Promise<Agunan> => {
    const response = await apiClient.put<Agunan>(`/agunan/${id}`, data);
    return response.data;
  },
};
