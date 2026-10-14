export type UserRole = 'ANALIS' | 'REVIEWER' | 'ADMIN';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  username: string;
  full_name: string;
  role: UserRole;
}

export type PengajuanStatus = 'DRAFT' | 'PROSES_ANALISA' | 'MENUNGGU_REVIEW' | 'DISETUJUI' | 'DITOLAK';

export interface Pengajuan {
  id: number;
  nomor_pengajuan: string;
  nama_debitur: string;
  cif: string;
  plafon_diajukan: number;
  jenis_kredit: string;
  status: PengajuanStatus;
  analyst_id: number;
  reviewer_id?: number | null;
  created_at: string;
  updated_at: string;
}

export type LegalitasTanah = 'SHM' | 'HGB' | 'GIRIK' | 'LAINNYA';
export type BentukTanah = 'PERSEGI' | 'PERSEGI_PANJANG' | 'KANTONG_SEMAR' | 'TIDAK_BERATURAN' | 'L';
export type JenisProperti = 'TANAH' | 'TANAH_BANGUNAN';

export interface Agunan {
  id: number;
  pengajuan_id: number;
  kode_agunan: string;
  jenis_properti: JenisProperti;
  lat: number;
  lon: number;
  alamat: string;
  kelurahan?: string | null;
  kecamatan?: string | null;
  kota_kabupaten: string;
  provinsi: string;
  luas_tanah: number;
  legalitas: LegalitasTanah;
  lebar_jalan: number;
  bentuk_tanah: BentukTanah;
  nilai_perolehan?: number | null;
  created_at: string;
  updated_at: string;
}

export type SumberData = 'LELANG' | 'APPRAISAL_KJPP' | 'APPRAISAL_INTERNAL' | 'SURVEI' | 'LISTING';
export type JenisHarga = 'TRANSAKSI' | 'PENAWARAN' | 'LIKUIDASI' | 'NILAI_PASAR';
export type KualitasGeocode = 'SANGAT_AKURAT' | 'AKURAT' | 'ESTIMASI' | 'KELURAHAN';

export interface Pembanding {
  id: number;
  kode_referensi: string;
  sumber: SumberData;
  jenis_harga: JenisHarga;
  lat: number;
  lon: number;
  alamat: string;
  kota_kabupaten: string;
  provinsi: string;
  luas_tanah: number;
  harga_total: number;
  harga_per_m2: number;
  tanggal_data: string;
  legalitas: LegalitasTanah;
  lebar_jalan: number;
  bentuk_tanah: BentukTanah;
  jenis_properti: JenisProperti;
  kualitas_geocode: KualitasGeocode;
  status_valid: boolean;
  catatan?: string | null;
  atribut_lain?: Record<string, any> | null;
  jarak_meter?: number;
  created_at?: string;
}

export interface AdjustmentDetails {
  adj_waktu_pct: number;
  adj_lokasi_pct: number;
  adj_luas_pct: number;
  adj_lebar_jalan_pct: number;
  adj_bentuk_pct: number;
  adj_legalitas_pct: number;
  total_adj_pct: number;
  waktu_bulan: number;
  jarak_meter: number;
}

export interface ValuasiPembandingDetail {
  id?: number;
  pembanding_id: number;
  kode_referensi?: string;
  sumber?: SumberData;
  jenis_harga?: JenisHarga;
  alamat?: string;
  luas_tanah?: number;
  harga_asli_per_m2: number;
  harga_cleansed_per_m2: number;
  faktor_diskon_penawaran: number;
  total_penyesuaian_pct: number;
  rincian_penyesuaian_json: AdjustmentDetails;
  harga_adjusted_per_m2: number;
  jarak_meter: number;
  skor_kemiripan: number;
  bobot_sumber: number;
  skor_akhir: number;
  bobot_kontribusi: number;
  is_override: boolean;
  alasan_override?: string | null;
  urutan: number;
}

export type ValuasiStatus = 'COMPLETED' | 'OVERRIDDEN' | 'DATA_TIDAK_CUKUP' | 'DRAFT';

export interface Valuasi {
  id: number;
  agunan_id: number;
  user_id: number;
  parameter_id: number;
  status: ValuasiStatus;
  estimasi_per_m2?: number | null;
  nilai_pasar?: number | null;
  rentang_min?: number | null;
  rentang_max?: number | null;
  nilai_likuidasi?: number | null;
  haircut_persen?: number | null;
  confidence_score?: number | null;
  radius_efektif_meter?: number | null;
  jumlah_kandidat: number;
  jumlah_pembanding_dipakai: number;
  versi_algoritma: string;
  catatan_analis?: string | null;
  snapshot_json: Record<string, any>;
  selected_pembanding: ValuasiPembandingDetail[];
  created_at: string;
  updated_at: string;
}

export interface ParameterValuasi {
  id: number;
  versi: string;
  judul: string;
  berlaku_dari: string;
  aktif: boolean;
  parameter_json: Record<string, any>;
  created_at: string;
  created_by: string;
}

export interface AuditLog {
  id: number;
  user_id?: number | null;
  action: string;
  entity_type?: string | null;
  entity_id?: number | null;
  ip_address?: string | null;
  rincian_json?: Record<string, any> | null;
  created_at: string;
}
