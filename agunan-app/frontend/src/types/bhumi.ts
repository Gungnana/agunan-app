export interface BhumiVerificationItem {
  id: string;
  nama_nasabah: string;
  no_permohonan?: string;
  alamat_agunan: string;
  latitude?: number;
  longitude?: number;
  jenis_sertifikat: 'SHM' | 'SHGB' | 'HAK_PAKAI' | 'LAINNYA';
  no_sertifikat: string;
  nib_bpn: string; // Nomor Identifikasi Bidang Tanah
  luas_sertifikat_m2: number;
  luas_peta_bpn_m2: number;
  selisih_luas_m2: number;
  selisih_persen: number;
  status_bidang: 'TERDAFTAR_LENGKAP' | 'BELUM_TERPETAKAN' | 'TUMPANG_TINDIH' | 'SENGKETA';
  zona_nilai_tanah_m2?: number; // ZNT dari BPN per m2
  catatan_blokir?: string;
  rekomendasi: 'VALID_CLEAR' | 'PERLU_KLARIFIKASI' | 'BERMASALAH_TOLAK';
  tanggal_verifikasi: string;
  analis: string;
  created_at: string;
}

export const SEED_BHUMI_VERIFICATIONS: BhumiVerificationItem[] = [
  {
    id: 'bhumi-1',
    nama_nasabah: 'I WAYAN SUDIRTA',
    no_permohonan: '088/BPRK/2026',
    alamat_agunan: 'Jl. Ahmad Yani Utara, Peguyangan Kangin, Denpasar Utara',
    latitude: -8.6183,
    longitude: 115.2215,
    jenis_sertifikat: 'SHM',
    no_sertifikat: 'SHM No. 1243/Peguyangan Kangin',
    nib_bpn: '22.01.04.02.01243',
    luas_sertifikat_m2: 350,
    luas_peta_bpn_m2: 348,
    selisih_luas_m2: -2,
    selisih_persen: -0.57,
    status_bidang: 'TERDAFTAR_LENGKAP',
    zona_nilai_tanah_m2: 4500000,
    catatan_blokir: 'Bidang tanah terdaftar bersih (Clear & Clean), batas fisik sesuai tembok permanen.',
    rekomendasi: 'VALID_CLEAR',
    tanggal_verifikasi: '22/10/2026',
    analis: 'I Putu Dimas Adiputra',
    created_at: '2026-10-22T08:30:00.000Z',
  },
  {
    id: 'bhumi-2',
    nama_nasabah: 'NI KETUT SEKARINI',
    no_permohonan: '111/BPRK/2026',
    alamat_agunan: 'Desa Peguyangan Kangin, Kec. Denpasar Utara, Kab. Denpasar',
    latitude: -8.6251,
    longitude: 115.2198,
    jenis_sertifikat: 'SHM',
    no_sertifikat: 'SHM No. 881/Peguyangan',
    nib_bpn: '22.01.04.02.00881',
    luas_sertifikat_m2: 250,
    luas_peta_bpn_m2: 195,
    selisih_luas_m2: -55,
    selisih_persen: -22.0,
    status_bidang: 'TUMPANG_TINDIH',
    zona_nilai_tanah_m2: 3800000,
    catatan_blokir: 'Terdapat tumpang tindih batas sekitar 55 m2 dengan sertifikat tetangga sebelah barat. Belum ada mediasi BPN.',
    rekomendasi: 'BERMASALAH_TOLAK',
    tanggal_verifikasi: '20/10/2026',
    analis: 'I Putu Dimas Adiputra',
    created_at: '2026-10-20T10:15:00.000Z',
  },
  {
    id: 'bhumi-3',
    nama_nasabah: 'PT ANUGERAH BERKAH INDAH',
    no_permohonan: '102/BPRK/2026',
    alamat_agunan: 'Kawasan Bypass Ngurah Rai, Sanur Kauh, Denpasar Selatan',
    latitude: -8.7052,
    longitude: 115.2471,
    jenis_sertifikat: 'SHGB',
    no_sertifikat: 'SHGB No. 401/Sanur Kauh',
    nib_bpn: '22.01.03.01.00401',
    luas_sertifikat_m2: 1200,
    luas_peta_bpn_m2: 1200,
    selisih_luas_m2: 0,
    selisih_persen: 0.0,
    status_bidang: 'BELUM_TERPETAKAN',
    zona_nilai_tanah_m2: 8500000,
    catatan_blokir: 'Peta bidang berstatus floating (belum terpetakan secara presisi spasial BPN), perlu pengukuran ulang kadastral.',
    rekomendasi: 'PERLU_KLARIFIKASI',
    tanggal_verifikasi: '18/10/2026',
    analis: 'I Putu Dimas Adiputra',
    created_at: '2026-10-18T14:00:00.000Z',
  },
];
