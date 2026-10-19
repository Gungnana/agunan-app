import React, { useState, useMemo } from 'react';
import {
  WalletCards,
  FileSpreadsheet,
  Upload,
  Download,
  RotateCcw,
  Sparkles,
  Info,
  Calendar,
  Building2,
  User,
  CreditCard,
  Plus,
  Trash2,
  FileText,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2,
  AlertCircle,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { RekapRekeningData, MonthRekap, DailyRecord } from '../types/rekening';
import { SAMPLE_REKAP_DATA, calculateMonthStats } from '../data/sampleRekeningData';
import { exportRekeningToExcel } from '../utils/exportRekeningExcel';
import { parseStatementFile, parseRawStatementText } from '../utils/bankStatementParser';

const formatRupiah = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
};

export const RekapRekeningPage: React.FC = () => {
  const [data, setData] = useState<RekapRekeningData>(SAMPLE_REKAP_DATA);
  const [activeTab, setActiveTab] = useState<'sideBySide' | 1 | 2 | 3>('sideBySide');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [uploadLoading, setUploadLoading] = useState<{ [monthIdx: number]: boolean }>({});
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  // Paste text modal state
  const [pasteModalMonth, setPasteModalMonth] = useState<number | null>(null);
  const [rawTextToPaste, setRawTextToPaste] = useState<string>('');

  // Calculate statistics for each month
  const statsMonth1 = useMemo(() => calculateMonthStats(data.months[0].records), [data.months[0]]);
  const statsMonth2 = useMemo(() => calculateMonthStats(data.months[1].records), [data.months[1]]);
  const statsMonth3 = useMemo(() => calculateMonthStats(data.months[2].records), [data.months[2]]);

  const statsList = [statsMonth1, statsMonth2, statsMonth3];

  // Overall 3-month average
  const rataRata3Bulan = useMemo(() => {
    const sumAvg = statsMonth1.rataRataSaldo + statsMonth2.rataRataSaldo + statsMonth3.rataRataSaldo;
    return Math.round(sumAvg / 3);
  }, [statsMonth1, statsMonth2, statsMonth3]);

  const totalKredit3Bulan = statsMonth1.totalMutasiKredit + statsMonth2.totalMutasiKredit + statsMonth3.totalMutasiKredit;
  const totalDebet3Bulan = statsMonth1.totalMutasiDebet + statsMonth2.totalMutasiDebet + statsMonth3.totalMutasiDebet;
  const countKredit3Bulan = statsMonth1.jumlahMutasiKredit + statsMonth2.jumlahMutasiKredit + statsMonth3.jumlahMutasiKredit;
  const countDebet3Bulan = statsMonth1.jumlahMutasiDebet + statsMonth2.jumlahMutasiDebet + statsMonth3.jumlahMutasiDebet;

  // Handle general info changes
  const handleDebiturChange = (field: 'namaDebitur' | 'tabBank' | 'noRek', val: string) => {
    setData((prev) => ({ ...prev, [field]: val }));
  };

  // Recalculate daily balances for a month
  const recalculateMonthBalances = (saldoAwal: number, records: DailyRecord[]): DailyRecord[] => {
    let currentSaldo = saldoAwal;
    return records.map((r) => {
      currentSaldo = currentSaldo - (r.debet || 0) + (r.kredit || 0);
      return {
        ...r,
        saldo: currentSaldo,
      };
    });
  };

  // Update starting balance of a month
  const handleSaldoAwalChange = (monthIdx: number, val: number) => {
    setData((prev) => {
      const updatedMonths = [...prev.months] as [MonthRekap, MonthRekap, MonthRekap];
      const targetMonth = updatedMonths[monthIdx];
      const newRecords = recalculateMonthBalances(val, targetMonth.records);
      updatedMonths[monthIdx] = {
        ...targetMonth,
        saldoAwal: val,
        records: newRecords,
      };
      return { ...prev, months: updatedMonths };
    });
  };

  // Update specific daily cell
  const handleDailyCellChange = (
    monthIdx: number,
    recordIdx: number,
    field: 'debet' | 'kredit',
    valueStr: string
  ) => {
    setData((prev) => {
      const updatedMonths = [...prev.months] as [MonthRekap, MonthRekap, MonthRekap];
      const targetMonth = updatedMonths[monthIdx];
      const cleanVal = valueStr === '' ? null : Math.max(0, parseInt(valueStr.replace(/\D/g, ''), 10) || 0);

      const updatedRecords = targetMonth.records.map((r, idx) => {
        if (idx === recordIdx) {
          return { ...r, [field]: cleanVal };
        }
        return r;
      });

      const recomputedRecords = recalculateMonthBalances(targetMonth.saldoAwal, updatedRecords);

      updatedMonths[monthIdx] = {
        ...targetMonth,
        records: recomputedRecords,
      };
      return { ...prev, months: updatedMonths };
    });
  };

  // Handle file upload for a specific month
  const handleFileUpload = async (monthIdx: number, file: File) => {
    try {
      setUploadLoading((prev) => ({ ...prev, [monthIdx]: true }));
      setUploadNotice(null);

      const targetMonth = data.months[monthIdx];
      const result = await parseStatementFile(file, targetMonth.monthNumber, targetMonth.year);

      setData((prev) => {
        const updatedMonths = [...prev.months] as [MonthRekap, MonthRekap, MonthRekap];
        updatedMonths[monthIdx] = {
          ...targetMonth,
          monthName: result.monthName || targetMonth.monthName,
          year: result.year || targetMonth.year,
          monthNumber: result.monthNumber || targetMonth.monthNumber,
          saldoAwal: result.saldoAwal || targetMonth.saldoAwal,
          records: result.records.length > 0 ? result.records : targetMonth.records,
        };

        return {
          ...prev,
          namaDebitur: result.namaDebitur || prev.namaDebitur,
          tabBank: result.tabBank || prev.tabBank,
          noRek: result.noRek || prev.noRek,
          months: updatedMonths,
        };
      });

      setUploadNotice(
        `Berhasil mengekstrak ${result.rawTransactionsCount} transaksi untuk ${targetMonth.monthName} dari ${file.name}`
      );
    } catch (err: any) {
      console.error(err);
      setUploadNotice(`Gagal membaca file: ${err.message || 'Format tidak didukung'}`);
    } finally {
      setUploadLoading((prev) => ({ ...prev, [monthIdx]: false }));
    }
  };

  // Handle paste text modal apply
  const handleApplyPastedText = () => {
    if (pasteModalMonth === null || !rawTextToPaste.trim()) return;
    const monthIdx = pasteModalMonth;
    const targetMonth = data.months[monthIdx];

    const result = parseRawStatementText(rawTextToPaste, targetMonth.monthNumber, targetMonth.year);

    setData((prev) => {
      const updatedMonths = [...prev.months] as [MonthRekap, MonthRekap, MonthRekap];
      updatedMonths[monthIdx] = {
        ...targetMonth,
        saldoAwal: result.saldoAwal || targetMonth.saldoAwal,
        records: result.records.length > 0 ? result.records : targetMonth.records,
      };
      return {
        ...prev,
        namaDebitur: result.namaDebitur || prev.namaDebitur,
        tabBank: result.tabBank || prev.tabBank,
        noRek: result.noRek || prev.noRek,
        months: updatedMonths,
      };
    });

    setUploadNotice(`Berhasil memproses teks mutasi untuk ${targetMonth.monthName}`);
    setPasteModalMonth(null);
    setRawTextToPaste('');
  };

  // Download Excel
  const handleDownloadExcel = async () => {
    try {
      setIsExporting(true);
      const blob = await exportRekeningToExcel(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanDebitur = data.namaDebitur.replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `Rekap_Rekening_Koran_${cleanDebitur}_3_Bulan.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Terjadi kesalahan saat mengenerate file Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  // Reset to default sample
  const handleResetToSample = () => {
    setData(SAMPLE_REKAP_DATA);
    setUploadNotice('Data berhasil dikembalikan ke contoh format referensi Heriyanto (BCA).');
  };

  // Render a single month table
  const renderMonthTable = (m: MonthRekap, mIdx: number) => {
    const stats = statsList[mIdx];
    return (
      <div key={m.monthIndex} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Table Month Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[11px] font-semibold text-blue-400 tracking-wider uppercase">
                Bulan Ke-{m.monthIndex}
              </span>
              <h3 className="text-base font-bold tracking-tight">{m.monthName}</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPasteModalMonth(mIdx)}
                title="Salin & Tempel teks mutasi"
                className="px-2.5 py-1 text-xs bg-slate-700/80 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center space-x-1.5 transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Teks</span>
              </button>
              <label
                title="Upload file PDF, XLSX, atau CSV"
                className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer flex items-center space-x-1.5 transition-all shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadLoading[mIdx] ? 'Memproses...' : 'Upload'}</span>
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(mIdx, file);
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Saldo Awal Banner */}
        <div className="px-4 py-2.5 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between text-xs">
          <div className="font-semibold text-slate-700 flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>Saldo Awal (Sebelum Tgl 1):</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-slate-500">Rp</span>
            <input
              type="text"
              value={m.saldoAwal ? m.saldoAwal.toLocaleString('id-ID') : '0'}
              onChange={(e) => {
                const val = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                handleSaldoAwalChange(mIdx, val);
              }}
              className="w-28 px-2 py-1 text-right font-bold text-blue-900 bg-white border border-blue-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 z-10">
              <tr>
                <th className="py-2 px-2 text-center w-10">No</th>
                <th className="py-2 px-2 text-center w-24">Tanggal</th>
                <th className="py-2 px-3 text-right">Debet</th>
                <th className="py-2 px-3 text-right">Kredit</th>
                <th className="py-2 px-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {m.records.map((r, rIdx) => {
                const hasDebet = r.debet && r.debet > 0;
                const hasKredit = r.kredit && r.kredit > 0;
                const isOdd = r.no % 2 === 1;

                return (
                  <tr
                    key={r.no}
                    className={`hover:bg-blue-50/40 transition-colors ${isOdd ? 'bg-white' : 'bg-slate-50/40'}`}
                  >
                    <td className="py-1.5 px-2 text-center text-slate-400 font-medium">{r.no}</td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-600">{r.dateStr}</td>
                    <td className="py-1 px-2 text-right">
                      <input
                        type="text"
                        value={hasDebet ? (r.debet?.toLocaleString('id-ID') || '') : ''}
                        placeholder="-"
                        onChange={(e) => handleDailyCellChange(mIdx, rIdx, 'debet', e.target.value)}
                        className={`w-full text-right py-0.5 px-1 rounded text-xs font-mono transition-colors focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                          hasDebet ? 'font-semibold text-rose-600' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                      />
                    </td>
                    <td className="py-1 px-2 text-right">
                      <input
                        type="text"
                        value={hasKredit ? (r.kredit?.toLocaleString('id-ID') || '') : ''}
                        placeholder="-"
                        onChange={(e) => handleDailyCellChange(mIdx, rIdx, 'kredit', e.target.value)}
                        className={`w-full text-right py-0.5 px-1 rounded text-xs font-mono transition-colors focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                          hasKredit ? 'font-semibold text-emerald-600' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                      />
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-800">
                      {formatRupiah(r.saldo)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Table Monthly Total Row */}
            <tfoot className="sticky bottom-0 bg-slate-100/95 backdrop-blur-sm border-t-2 border-slate-300 font-bold text-slate-900 z-10">
              <tr>
                <td className="py-2.5 px-2 text-center" colSpan={2}>
                  Total
                </td>
                <td className="py-2.5 px-3 text-right text-rose-700 font-mono">
                  {formatRupiah(stats.totalMutasiDebet)}
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-700 font-mono">
                  {formatRupiah(stats.totalMutasiKredit)}
                </td>
                <td className="py-2.5 px-3 text-right text-blue-900 font-mono">
                  {formatRupiah(m.records.reduce((acc, c) => acc + c.saldo, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Monthly Summary Statistics Box (Matching Excel bottom box) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 mt-auto">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Ringkasan Mutasi {m.monthName}
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
              <span className="text-slate-600">Total mutasi kredit</span>
              <span className="font-bold text-emerald-700 font-mono">{formatRupiah(stats.totalMutasiKredit)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
              <span className="text-slate-600">Total mutasi debet</span>
              <span className="font-bold text-rose-700 font-mono">{formatRupiah(stats.totalMutasiDebet)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
              <span className="text-slate-600">Jumlah mutasi kredit</span>
              <span className="font-semibold text-slate-800">{stats.jumlahMutasiKredit} Kali</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
              <span className="text-slate-600">Jumlah mutasi debet</span>
              <span className="font-semibold text-slate-800">{stats.jumlahMutasiDebet} Kali</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
              <span className="text-slate-600">Saldo tertinggi</span>
              <span className="font-bold text-blue-800 font-mono">{formatRupiah(stats.saldoTertinggi)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
              <span className="text-slate-600">Saldo terendah</span>
              <span className="font-bold text-amber-800 font-mono">{formatRupiah(stats.saldoTerendah)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 bg-blue-100/70 px-2 rounded-lg font-bold">
              <span className="text-blue-900">Rata-rata saldo</span>
              <span className="text-blue-900 font-mono text-sm">{formatRupiah(stats.rataRataSaldo)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs font-semibold">
              <WalletCards className="w-3.5 h-3.5" />
              <span>Modul Analisis Perbankan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Rekap Rekening Koran (3 Bulan)
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Upload file rekening koran 3 bulan terakhir (PDF, Excel, atau CSV). Sistem otomatis
              merekap mutasi harian, menghitung saldo berjalan, dan mengenerate spreadsheet Excel sesuai
              format baku analis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleResetToSample}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs sm:text-sm font-semibold border border-white/20 backdrop-blur-sm transition-all flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Muat Contoh Format</span>
            </button>

            <button
              onClick={handleDownloadExcel}
              disabled={isExporting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-700/30 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExporting ? 'Mengenerate...' : 'Unduh Rekap Excel (Berumus)'}</span>
            </button>
          </div>
        </div>

        {/* Upload notice message if present */}
        {uploadNotice && (
          <div className="mt-4 p-3 bg-blue-900/60 border border-blue-400/30 rounded-xl text-xs text-blue-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{uploadNotice}</span>
            </div>
            <button
              onClick={() => setUploadNotice(null)}
              className="text-blue-300 hover:text-white text-xs underline ml-3"
            >
              Tutup
            </button>
          </div>
        )}
      </div>

      {/* 4 Summary Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hero Card: Rata-rata 3 Bulan */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-blue-100 uppercase tracking-wide">
              Rata-Rata Saldo 3 Bulan
            </span>
            <Activity className="w-5 h-5 text-blue-200" />
          </div>
          <div className="text-2xl font-extrabold tracking-tight font-mono">
            {formatRupiah(rataRata3Bulan)}
          </div>
          <p className="text-[11px] text-blue-200 mt-2">
            Mei: {formatRupiah(statsMonth1.rataRataSaldo)} · Jun: {formatRupiah(statsMonth2.rataRataSaldo)} · Jul: {formatRupiah(statsMonth3.rataRataSaldo)}
          </p>
        </div>

        {/* Total Mutasi Kredit */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Total Mutasi Kredit
            </span>
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold tracking-tight text-emerald-600 font-mono">
            {formatRupiah(totalKredit3Bulan)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            Total {countKredit3Bulan} kali transaksi penerimaan / masuk
          </p>
        </div>

        {/* Total Mutasi Debet */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Total Mutasi Debet
            </span>
            <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold tracking-tight text-rose-600 font-mono">
            {formatRupiah(totalDebet3Bulan)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            Total {countDebet3Bulan} kali transaksi penarikan / keluar
          </p>
        </div>

        {/* Peak & Lowest Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Saldo Ekstrem (3 Bulan)
            </span>
            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 mt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Tertinggi:</span>
              <span className="font-bold text-slate-900 font-mono">
                {formatRupiah(Math.max(statsMonth1.saldoTertinggi, statsMonth2.saldoTertinggi, statsMonth3.saldoTertinggi))}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Terendah:</span>
              <span className="font-bold text-amber-700 font-mono">
                {formatRupiah(Math.min(statsMonth1.saldoTerendah, statsMonth2.saldoTerendah, statsMonth3.saldoTerendah))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Info Form Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2 text-sm font-bold text-slate-800 mb-4">
          <Info className="w-4 h-4 text-blue-600" />
          <span>Informasi Debitur & Rekening Tabungan</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nama Debitur
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={data.namaDebitur}
                onChange={(e) => handleDebiturChange('namaDebitur', e.target.value)}
                placeholder="e.g. Heriyanto"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tabungan Bank
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={data.tabBank}
                onChange={(e) => handleDebiturChange('tabBank', e.target.value)}
                placeholder="e.g. BCA, MANDIRI, BRI"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nomor Rekening
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={data.noRek}
                onChange={(e) => handleDebiturChange('noRek', e.target.value)}
                placeholder="e.g. 4160641164"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs / View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('sideBySide')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'sideBySide'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3 Bulan Berdampingan (Sesuai Excel)
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 1
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {data.months[0].monthName}
          </button>
          <button
            onClick={() => setActiveTab(2)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 2
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {data.months[1].monthName}
          </button>
          <button
            onClick={() => setActiveTab(3)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 3
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {data.months[2].monthName}
          </button>
        </div>

        <div className="text-xs text-slate-500 flex items-center space-x-1">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Kolom debet dan kredit dapat diedit langsung. Saldo akan otomatis berhitung ulang.</span>
        </div>
      </div>

      {/* Tables Section */}
      {activeTab === 'sideBySide' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {data.months.map((m, idx) => renderMonthTable(m, idx))}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          {renderMonthTable(data.months[activeTab - 1], activeTab - 1)}
        </div>
      )}

      {/* Bottom Grand Summary Banner (Matching Excel bottom-left row) */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-300 font-medium">Kesimpulan Hasil Analisa:</div>
            <div className="text-lg sm:text-xl font-bold tracking-tight">
              Rata-rata saldo 3 Bulan Terakhir :{' '}
              <span className="text-emerald-400 font-mono">{formatRupiah(rataRata3Bulan)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleDownloadExcel}
          disabled={isExporting}
          className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-700/30 transition-all flex items-center justify-center space-x-2 text-sm"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{isExporting ? 'Mengenerate...' : 'Unduh Rekap Excel Sesuai Format'}</span>
        </button>
      </div>

      {/* Paste Text Modal */}
      {pasteModalMonth !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Tempel Teks Mutasi ({data.months[pasteModalMonth].monthName})
                </h3>
              </div>
              <button
                onClick={() => setPasteModalMonth(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Salin (copy) baris mutasi rekening dari internet banking atau e-statement, lalu tempelkan (paste) di bawah ini. Sistem akan mendeteksi tanggal, debet, kredit, dan saldo harian secara otomatis.
            </p>

            <textarea
              rows={8}
              value={rawTextToPaste}
              onChange={(e) => setRawTextToPaste(e.target.value)}
              placeholder="Contoh:&#10;01/05 TRSF E-BANKING CR 500.000 1.547.751&#10;02/05 TARIKAN ATM DB 200.000 1.347.751"
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <div className="flex justify-end items-center space-x-3 pt-2">
              <button
                onClick={() => {
                  setPasteModalMonth(null);
                  setRawTextToPaste('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleApplyPastedText}
                disabled={!rawTextToPaste.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl shadow-md transition-all"
              >
                Terapkan ke Tabel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RekapRekeningPage;
