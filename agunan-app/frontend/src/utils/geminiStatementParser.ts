import { RekapRekeningData } from '../types/rekening';
import { StatementParseResult, buildThreeMonthRekap } from './bankStatementParser';

const LOCAL_STORAGE_KEY = 'gemini_api_key';

export function getStoredGeminiApiKey(): string {
  try {
    return (
      localStorage.getItem(LOCAL_STORAGE_KEY) ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      ''
    );
  } catch {
    return '';
  }
}

export function setStoredGeminiApiKey(key: string): void {
  try {
    if (!key || !key.trim()) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEY, key.trim());
    }
  } catch (err) {
    console.error('Gagal menyimpan API key ke localStorage:', err);
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1] || result;
      resolve(base64Data);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

const GEMINI_SYSTEM_PROMPT = `Anda adalah sistem analis kredit perbankan berakurasi tinggi.
Tugas Anda adalah membaca dan mengekstrak seluruh data mutasi rekening koran (bank statement) pada dokumen ini secara lengkap, presisi, dan terstruktur.

Ekstrak informasi berikut dalam format JSON:
1. "namaDebitur": Nama lengkap pemilik rekening / nasabah (huruf kapital).
2. "tabBank": Nama bank penerbit (misal: "MANDIRI", "BCA", "BRI", "BNI", "BPD BALI", "BPR BANK KERTIAWAN", dll).
3. "noRek": Nomor rekening tanpa spasi atau petik.
4. "monthsData": Array bulan transaksi (urut kronologis). Tiap elemen berisi:
   - "monthName": Nama bulan dan tahun (misal: "Agustus 2026")
   - "monthNumber": Angka bulan (1-12)
   - "year": Tahun 4 digit (misal: 2026)
   - "saldoAwal": Saldo awal bulan tersebut (angka murni tanpa titik/koma)
   - "saldoAkhir": Saldo akhir bulan tersebut
   - "txs": Array seluruh transaksi pada bulan tersebut. Tiap transaksi memuat:
     * "date": Format "DD/MM" (misal: "04/08")
     * "day": Tanggal 1-31 (integer)
     * "month": Bulan 1-12 (integer)
     * "year": Tahun (integer)
     * "desc": Keterangan transaksi / remarks
     * "isDb": Boolean (true jika uang keluar / debet / penarikan / biaya / tanda minus; false jika uang masuk / kredit / setoran / tanda plus)
     * "amount": Nilai nominal mutasi murni (angka positif, contoh: 200000)
     * "saldo": Saldo setelah transaksi tersebut berjalan

PASTIKAN SEMUA TRANSAKSI TERBACA LENGKAP TANPA ADA YANG TERLEWAT.
HANYA KEMBALIKAN OUTPUT DALAM FORMAT JSON VALID.`;

/**
 * Ekstraksi mutasi rekening koran menggunakan Google Gemini Multimodal AI.
 * Prioritas 1: Panggil Google AI Studio API langsung dari browser (cepat & tanpa limit upload backend).
 * Prioritas 2: Fallback ke endpoint backend /api/v1/rekap-rekening/extract-ai.
 */
export async function processStatementsWithGeminiAI(
  files: File[],
  apiKeyInput?: string
): Promise<RekapRekeningData> {
  const apiKey = (apiKeyInput || getStoredGeminiApiKey()).trim();

  if (files.length === 0) {
    throw new Error('Pilih minimal 1 file rekening koran untuk diproses dengan AI.');
  }

  const parsedResults: StatementParseResult[] = [];

  for (const file of files) {
    let parseRes: StatementParseResult | null = null;
    let lastError = '';

    // Cara 1: Direct Client Call to Google AI Studio
    if (apiKey) {
      try {
        const base64Data = await fileToBase64(file);
        let mimeType = 'application/pdf';
        const nameLower = file.name.toLowerCase();
        if (nameLower.endsWith('.png')) mimeType = 'image/png';
        else if (nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else if (nameLower.endsWith('.webp')) mimeType = 'image/webp';

        const payload = {
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: GEMINI_SYSTEM_PROMPT,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            response_mime_type: 'application/json',
          },
        };

        // Dynamic discovery of models supported by this API key
        let candidateModels: string[] = [];
        try {
          const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          if (listRes.ok) {
            const listData = await listRes.json();
            const supported = (listData.models || [])
              .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
              .map((m: any) => m.name.replace(/^models\//, ''));

            const flashModels = supported.filter((m: string) => /flash/i.test(m));
            const otherModels = supported.filter((m: string) => !/flash/i.test(m));
            candidateModels = [...flashModels, ...otherModels];
          }
        } catch (e) {
          console.warn('Gagal mengambil daftar model Gemini:', e);
        }

        if (candidateModels.length === 0) {
          candidateModels = [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-2.0-flash-exp',
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash',
            'gemini-1.5-pro-latest',
          ];
        }

        for (const model of candidateModels) {
          try {
            const cleanModelName = model.replace(/^models\//, '');
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              const resData = await response.json();
              const textContent = resData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (textContent) {
                let cleanJson = textContent.trim();
                if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
                if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
                if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);
                cleanJson = cleanJson.trim();
                parseRes = JSON.parse(cleanJson);
                break;
              }
            } else {
              const errBody = await response.text();
              lastError = `Google AI Studio (${cleanModelName}) error: ${response.status} - ${errBody}`;
            }
          } catch (modelErr: any) {
            lastError = modelErr.message || String(modelErr);
          }
        }
      } catch (err: any) {
        lastError = err.message || String(err);
      }
    }

    // Cara 2: Fallback ke Backend FastAPI endpoint
    if (!parseRes) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (apiKey) {
          formData.append('api_key', apiKey);
        }

        const backendUrl = '/api/v1/rekap-rekening/extract-ai';
        const headers: Record<string, string> = {};
        if (apiKey) {
          headers['x-gemini-api-key'] = apiKey;
        }

        const backendRes = await fetch(backendUrl, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (backendRes.ok) {
          const jsonRes = await backendRes.json();
          parseRes = jsonRes.data;
        } else {
          const errDetail = await backendRes.text();
          throw new Error(errDetail || lastError);
        }
      } catch (backendErr: any) {
        if (!apiKey) {
          throw new Error(
            'Google AI Studio API Key belum ditentukan. Silakan masukkan API Key Google AI Studio Anda (Gratis didapatkan di https://aistudio.google.com/).'
          );
        }
        throw new Error(
          `Gagal memproses rekening koran dengan Gemini AI: ${backendErr.message || lastError}`
        );
      }
    }

    if (parseRes) {
      parsedResults.push(parseRes);
    }
  }

  return buildThreeMonthRekap(parsedResults);
}
