import { apiClient } from './client';
import { Valuasi } from '../types';

export const valuasiApi = {
  analisa: async (agunanId: number, parameterId?: number): Promise<Valuasi> => {
    const response = await apiClient.post<Valuasi>('/valuasi/analisa', {
      agunan_id: agunanId,
      parameter_id: parameterId,
    });
    return response.data;
  },

  getById: async (id: number): Promise<Valuasi> => {
    const response = await apiClient.get<Valuasi>(`/valuasi/${id}`);
    return response.data;
  },

  override: async (
    id: number,
    selectedPembandingIds: number[],
    alasan: string
  ): Promise<Valuasi> => {
    const response = await apiClient.post<Valuasi>(`/valuasi/${id}/override`, {
      selected_pembanding_ids: selectedPembandingIds,
      alasan,
    });
    return response.data;
  },

  downloadPdf: async (id: number, kodeAgunan: string): Promise<void> => {
    const response = await apiClient.get(`/valuasi/${id}/export-pdf`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Lampiran_MAK_Valuasi_${kodeAgunan}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
