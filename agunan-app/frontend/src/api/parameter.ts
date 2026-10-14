import { apiClient } from './client';
import { ParameterValuasi } from '../types';

export const parameterApi = {
  getAll: async (): Promise<ParameterValuasi[]> => {
    const response = await apiClient.get<ParameterValuasi[]>('/parameter/');
    return response.data;
  },

  getActive: async (): Promise<ParameterValuasi> => {
    const response = await apiClient.get<ParameterValuasi>('/parameter/active');
    return response.data;
  },

  activate: async (id: number): Promise<ParameterValuasi> => {
    const response = await apiClient.put<ParameterValuasi>(`/parameter/${id}/activate`);
    return response.data;
  },
};
