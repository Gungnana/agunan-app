export interface DailyRecord {
  no: number;
  dateStr: string; // e.g. "01-May-26"
  day: number;
  month: number; // 1-12
  year: number;
  debet: number | null;
  kredit: number | null;
  saldo: number;
}

export interface MonthRekap {
  monthIndex: number; // 1, 2, 3
  monthName: string; // e.g. "Mei 2026"
  year: number;
  monthNumber: number; // 1-12
  saldoAwal: number;
  records: DailyRecord[];
}

export interface RekapRekeningData {
  namaDebitur: string;
  tabBank: string;
  noRek: string;
  months: [MonthRekap, MonthRekap, MonthRekap];
}

export interface MonthStats {
  totalMutasiKredit: number;
  totalMutasiDebet: number;
  jumlahMutasiKredit: number;
  jumlahMutasiDebet: number;
  saldoTertinggi: number;
  saldoTerendah: number;
  rataRataSaldo: number;
}
