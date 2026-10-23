import { apiClient } from './client';
import { RekapRekeningData } from '../types/rekening';

/**
 * Mengirimkan berkas rekening koran (PDF atau scan gambar)
 * ke endpoint backend PaddleOCR untuk diekstraksi.
 */
export async function parseStatementWithPaddleOCR(
  file: File,
  password?: string
): Promise<RekapRekeningData> {
  const formData = new FormData();
  formData.append('file', file);
  if (password) {
    formData.append('password', password);
  }

  const response = await apiClient.post<RekapRekeningData>(
    '/rekap-rekening/ocr-parse',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // OCR neural inference on CPU may take 20-60 detik
    }
  );

  return response.data;
}
