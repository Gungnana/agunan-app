import { apiClient } from './client';
import {
  RejectionLogItem,
  RejectionStats,
  SEED_REJECTION_DATA,
} from '../types/rejectionLog';

const LOCAL_STORAGE_KEY = 'agunan_rejection_logs_v2';

function getLocalData(): RejectionLogItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_REJECTION_DATA));
      return SEED_REJECTION_DATA;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return SEED_REJECTION_DATA;
  } catch (e) {
    console.warn('Gagal membaca localStorage rejection logs:', e);
    return SEED_REJECTION_DATA;
  }
}

function saveLocalData(data: RejectionLogItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Gagal menyimpan ke localStorage:', e);
  }
}

export function computeRejectionStats(items: RejectionLogItem[]): RejectionStats {
  const totalRejections = items.length;
  const totalPlafon = items.reduce((sum, item) => sum + (item.plafon_pengajuan || 0), 0);

  const byKapasitas: Record<string, number> = {};
  const byJenisKredit: Record<string, number> = {};
  const byKantor: Record<string, number> = {};

  items.forEach((item) => {
    const kap = item.kapasitas || 'TOLAK';
    byKapasitas[kap] = (byKapasitas[kap] || 0) + 1;

    const jk = item.jenis_kredit || 'LAINNYA';
    byJenisKredit[jk] = (byJenisKredit[jk] || 0) + 1;

    const kt = item.kantor || 'KPO';
    byKantor[kt] = (byKantor[kt] || 0) + 1;
  });

  return {
    totalRejections,
    totalPlafon,
    byKapasitas,
    byJenisKredit,
    byKantor,
  };
}

export const rejectionLogApi = {
  getAll: async (params?: {
    q?: string;
    jenis_kredit?: string;
    kapasitas?: string;
    kantor?: string;
  }): Promise<RejectionLogItem[]> => {
    try {
      const response = await apiClient.get<RejectionLogItem[]>('/rejection-log/', { params });
      if (Array.isArray(response.data) && response.data.length > 0) {
        saveLocalData(response.data);
        return response.data;
      }
    } catch {
      // Backend unavailable, fallback to local storage
    }

    let items = getLocalData();

    if (params?.q) {
      const term = params.q.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.nama.toLowerCase().includes(term) ||
          (i.no_permohonan && i.no_permohonan.toLowerCase().includes(term)) ||
          (i.nik_npwp && i.nik_npwp.toLowerCase().includes(term)) ||
          (i.alamat && i.alamat.toLowerCase().includes(term)) ||
          i.alasan_ditolak.toLowerCase().includes(term) ||
          (i.peruntukan_kredit && i.peruntukan_kredit.toLowerCase().includes(term))
      );
    }

    if (params?.jenis_kredit && params.jenis_kredit !== 'ALL') {
      items = items.filter((i) => i.jenis_kredit === params.jenis_kredit);
    }

    if (params?.kapasitas && params.kapasitas !== 'ALL') {
      items = items.filter((i) => i.kapasitas === params.kapasitas);
    }

    if (params?.kantor && params.kantor !== 'ALL') {
      items = items.filter((i) => i.kantor === params.kantor);
    }

    return items;
  },

  getById: async (id: string): Promise<RejectionLogItem | null> => {
    try {
      const response = await apiClient.get<RejectionLogItem>(`/rejection-log/${id}`);
      return response.data;
    } catch {
      const items = getLocalData();
      return items.find((i) => String(i.id) === String(id)) || null;
    }
  },

  create: async (data: Omit<RejectionLogItem, 'id' | 'created_at' | 'updated_at'>): Promise<RejectionLogItem> => {
    const newItem: RejectionLogItem = {
      ...data,
      id: `rej-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const response = await apiClient.post<RejectionLogItem>('/rejection-log/', data);
      if (response.data) {
        const items = getLocalData();
        saveLocalData([response.data, ...items]);
        return response.data;
      }
    } catch {
      // Backend fallback
    }

    const items = getLocalData();
    const updated = [newItem, ...items];
    saveLocalData(updated);
    return newItem;
  },

  update: async (id: string, data: Partial<RejectionLogItem>): Promise<RejectionLogItem> => {
    try {
      const response = await apiClient.put<RejectionLogItem>(`/rejection-log/${id}`, data);
      if (response.data) {
        const items = getLocalData();
        const updated = items.map((i) => (String(i.id) === String(id) ? response.data : i));
        saveLocalData(updated);
        return response.data;
      }
    } catch {
      // Backend fallback
    }

    const items = getLocalData();
    let updatedItem: RejectionLogItem | null = null;
    const updated = items.map((i) => {
      if (String(i.id) === String(id)) {
        updatedItem = { ...i, ...data, updated_at: new Date().toISOString() };
        return updatedItem;
      }
      return i;
    });
    saveLocalData(updated);
    return updatedItem || (data as RejectionLogItem);
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/rejection-log/${id}`);
    } catch {
      // Ignore backend error for local sync
    }

    const items = getLocalData();
    const filtered = items.filter((i) => String(i.id) !== String(id));
    saveLocalData(filtered);
    return true;
  },

  resetToSeed: (): RejectionLogItem[] => {
    saveLocalData(SEED_REJECTION_DATA);
    return SEED_REJECTION_DATA;
  },
};
