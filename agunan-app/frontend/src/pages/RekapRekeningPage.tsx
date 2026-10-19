import React, { useState, useMemo, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  User,
  CreditCard,
  Calendar,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  Edit3,
  Check,
} from 'lucide-react';
import { RekapRekeningData, MonthRekap } from '../types/rekening';
import { SAMPLE_REKAP_DATA, SAMPLE_MOH_ASMIK_DATA, calculateMonthStats } from '../data/sampleRekeningData';
import { exportRekeningToExcel } from '../utils/exportRekeningExcel';
import { processUploadedBankStatements } from '../utils/bankStatementParser';

const formatRupiah = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
};

export const RekapRekeningPage: React.FC = () => {
  // Upload and data states
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [rekapData, setRekapData] = useState<RekapRekeningData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [isEditingMeta, setIsEditingMeta] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Statistics calculation when rekapData is present
  const statsMonth1 = useMemo(
    () => (rekapData ? calculateMonthStats(rekapData.months[0].records, rekapData.months[0].saldoAwal) : null),
    [rekapData]
  );
  const statsMonth2 = useMemo(
    () => (rekapData ? calculateMonthStats(rekapData.months[1].records, rekapData.months[1].saldoAwal) : null),
    [rekapData]
  );
  const statsMonth3 = useMemo(
    () => (rekapData ? calculateMonthStats(rekapData.months[2].records, rekapData.months[2].saldoAwal) : null),
    [rekapData]
  );

  const rataRata3Bulan = useMemo(() => {
    if (!statsMonth1 || !statsMonth2 || !statsMonth3) return 0;
    return Math.round((statsMonth1.rataRataSaldo + statsMonth2.rataRataSaldo + statsMonth3.rataRataSaldo) / 3);
  }, [statsMonth1, statsMonth2, statsMonth3]);

  const totalKredit3Bulan = useMemo(() => {
    if (!statsMonth1 || !statsMonth2 || !statsMonth3) return 0;
    return statsMonth1.totalMutasiKredit + statsMonth2.totalMutasiKredit + statsMonth3.totalMutasiKredit;
  }, [statsMonth1, statsMonth2, statsMonth3]);

  const totalDebet3Bulan = useMemo(() => {
    if (!statsMonth1 || !statsMonth2 || !statsMonth3) return 0;
    return statsMonth1.totalMutasiDebet + statsMonth2.totalMutasiDebet + statsMonth3.totalMutasiDebet;
  }, [statsMonth1, statsMonth2, statsMonth3]);

  // Handle file processing
  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setUploadedFiles(files);

      const parsed = await processUploadedBankStatements(files);
      setRekapData(parsed);
    } catch (err: any) {
      console.error('Error processing bank statement files:', err);
      setErrorMessage(err.message || 'Gagal memproses file rekening koran. Pastikan format file sesuai.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  // Quick test demo
  const handleUseSample = (type: 'moh_asmik' | 'heriyanto' = 'moh_asmik') => {
    setIsProcessing(true);
    setTimeout(() => {
      if (type === 'moh_asmik') {
        setUploadedFiles([
          new File(['sample_bca_moh_asmik'], 'Rekening_Tahapan_BCA_MOH_ASMIK.pdf', { type: 'application/pdf' }),
        ]);
        setRekapData(SAMPLE_MOH_ASMIK_DATA);
      } else {
        setUploadedFiles([
          new File(['sample_bca_heriyanto'], 'Rekening_Koran_BCA_Heriyanto.pdf', { type: 'application/pdf' }),
        ]);
        setRekapData(SAMPLE_REKAP_DATA);
      }
      setIsProcessing(false);
    }, 300);
  };

  // Download Excel
  const handleDownloadExcel = async () => {
    if (!rekapData) return;
    try {
      setIsExporting(true);
      const blob = await exportRekeningToExcel(rekapData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanDebitur = (rekapData.namaDebitur || 'Debitur').replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `Rekap_Rekening_Koran_${cleanDebitur}_3_Bulan.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Terjadi kesalahan saat mengunduh file Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  // Reset to upload another file
  const handleReset = () => {
    setUploadedFiles([]);
    setRekapData(null);
    setErrorMessage(null);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs font-semibold">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Rekap Otomatis Rekening Koran</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Rekap Rekening Koran (3 Bulan)
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Cukup unggah file rekening koran 3 bulan terakhir. Sistem akan secara otomatis menganalisis
            mutasi debet & kredit, menghitung saldo berjalan, dan mengenerate spreadsheet Excel sesuai format baku analis.
          </p>
        </div>
      </div>

      {/* Upload Zone (Tampil jika belum ada data atau sedang ganti file) */}
      {!rekapData && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-12 text-center transition-all">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 transition-all flex flex-col items-center justify-center space-y-4 cursor-pointer ${
              isDragOver
                ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/60'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                Pilih atau Tarik File Rekening Koran ke Sini
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Mendukung berkas <strong>PDF e-statement</strong>, <strong>Excel (.xlsx, .xls)</strong>, atau <strong>CSV</strong> (Bisa 1 file 3 bulan atau hingga 3 file per bulan).
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) handleFiles(files);
              }}
            />

            <button
              type="button"
              disabled={isProcessing}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-500/25 transition-all flex items-center space-x-2"
            >
              <span>{isProcessing ? 'Memproses Berkas...' : 'Unggah File Rekening Koran'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Demo Test Option */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
            <span>Uji coba cepat rekapan:</span>
            <button
              type="button"
              onClick={() => handleUseSample('moh_asmik')}
              className="font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center space-x-1 underline"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Contoh BCA: MOH ASMIK (3 Bulan)</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => handleUseSample('heriyanto')}
              className="font-semibold text-slate-600 hover:text-slate-800 inline-flex items-center space-x-1 underline"
            >
              <span>Contoh BCA: Heriyanto</span>
            </button>
          </div>

          {errorMessage && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Loading state during parsing */}
      {isProcessing && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-800">Sedang Menganalisis Rekening Koran...</h4>
            <p className="text-xs text-slate-500">
              Mengekstrak tanggal mutasi, debet, kredit, saldo berjalan, dan menyusun formula Excel.
            </p>
          </div>
        </div>
      )}

      {/* Result Card: Tampil begitu rekap selesai diproses */}
      {rekapData && !isProcessing && (
        <div className="space-y-6">
          {/* Success Banner & Primary Download Action */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    File Rekening Koran Berhasil Diproses!
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hasil rekapan 3 bulan telah selesai dihitung dan siap diunduh dalam format Excel berumus.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Unggah File Lain</span>
                </button>

                <button
                  onClick={handleDownloadExcel}
                  disabled={isExporting}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-700/25 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'Mengenerate Excel...' : 'Download Hasil Rekap Excel'}</span>
                </button>
              </div>
            </div>

            {/* Debitur & Rekening Metadata Card */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 text-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-700 uppercase tracking-wide">Identitas Rekening Terbaca:</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                    rekapData.tabBank === 'BRI'
                      ? 'bg-blue-600 text-white'
                      : rekapData.tabBank === 'BCA'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-white'
                  }`}>
                    {rekapData.tabBank}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingMeta(!isEditingMeta)}
                  className="inline-flex items-center space-x-1 font-semibold text-blue-600 hover:text-blue-800 text-xs"
                >
                  {isEditingMeta ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Selesai Edit</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Ubah Info Nasabah/Bank</span>
                    </>
                  )}
                </button>
              </div>

              {isEditingMeta ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Nama Debitur / Pemilik</label>
                    <input
                      type="text"
                      value={rekapData.namaDebitur}
                      onChange={(e) => setRekapData({ ...rekapData, namaDebitur: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Contoh: I WAYAN SUDIRTA"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Nama Bank</label>
                    <input
                      type="text"
                      value={rekapData.tabBank}
                      onChange={(e) => setRekapData({ ...rekapData, tabBank: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Contoh: BRI, BCA, MANDIRI"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Nomor Rekening</label>
                    <input
                      type="text"
                      value={rekapData.noRek}
                      onChange={(e) => setRekapData({ ...rekapData, noRek: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Contoh: 0017-01-023456-50-8"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-slate-400 font-medium">Nama Debitur:</span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">{rekapData.namaDebitur}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Tabungan Bank:</span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5 flex items-center space-x-1.5">
                      <span>{rekapData.tabBank}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Nomor Rekening:</span>
                    <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{rekapData.noRek}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Periode Rekap:</span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {rekapData.months[0].monthName} – {rekapData.months[2].monthName}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Highlight Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-blue-100 uppercase tracking-wide">
                    Rata-Rata Saldo 3 Bulan Terakhir
                  </span>
                  <Activity className="w-5 h-5 text-blue-200" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono">
                  {formatRupiah(rataRata3Bulan)}
                </div>
                <p className="text-[11px] text-blue-200 mt-2">
                  Mei: {formatRupiah(statsMonth1?.rataRataSaldo)} · Jun: {formatRupiah(statsMonth2?.rataRataSaldo)} · Jul: {formatRupiah(statsMonth3?.rataRataSaldo)}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total Mutasi Kredit
                  </span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold tracking-tight text-emerald-600 font-mono">
                  {formatRupiah(totalKredit3Bulan)}
                </div>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">
                  {((statsMonth1?.jumlahMutasiKredit || 0) + (statsMonth2?.jumlahMutasiKredit || 0) + (statsMonth3?.jumlahMutasiKredit || 0))} kali transaksi masuk
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total Mutasi Debet
                  </span>
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-extrabold tracking-tight text-rose-600 font-mono">
                  {formatRupiah(totalDebet3Bulan)}
                </div>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">
                  {((statsMonth1?.jumlahMutasiDebet || 0) + (statsMonth2?.jumlahMutasiDebet || 0) + (statsMonth3?.jumlahMutasiDebet || 0))} kali transaksi keluar
                </p>
              </div>
            </div>

            {/* Bottom Download Excel Banner */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base">File Excel Rekapan Siap Diunduh</h4>
                  <p className="text-xs text-slate-400">
                    Format 3 bulan berdampingan dengan rumus otomatis (=SUM, =MAX, =MIN, =ROUND, saldo berjalan).
                  </p>
                </div>
              </div>

              <button
                onClick={handleDownloadExcel}
                disabled={isExporting}
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-700/30 transition-all flex items-center justify-center space-x-2 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Mengenerate...' : 'Download Hasil Rekap Excel'}</span>
              </button>
            </div>
          </div>

          {/* Optional Collapsible Preview */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="w-full px-6 py-4 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span>{showPreview ? 'Sembunyikan Pratinjau Tabel 3 Bulan' : 'Tampilkan Pratinjau Tabel 3 Bulan'}</span>
              {showPreview ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showPreview && (
              <div className="p-6 border-t border-slate-200">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {rekapData.months.map((m, mIdx) => {
                    const stats = [statsMonth1, statsMonth2, statsMonth3][mIdx];
                    return (
                      <div key={m.monthIndex} className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col">
                        <div className="font-bold text-slate-800 text-sm mb-2">{m.monthName}</div>
                        <div className="text-xs text-slate-500 mb-2">
                          Saldo Awal: <strong className="text-slate-800">{formatRupiah(m.saldoAwal)}</strong>
                        </div>
                        <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl bg-white mb-4">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 text-slate-600 sticky top-0">
                              <tr>
                                <th className="p-2 text-center">Tgl</th>
                                <th className="p-2 text-right">Debet</th>
                                <th className="p-2 text-right">Kredit</th>
                                <th className="p-2 text-right">Saldo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono">
                              {m.records.map((r) => (
                                <tr key={r.no}>
                                  <td className="p-1.5 text-center text-slate-500">{r.day}</td>
                                  <td className="p-1.5 text-right text-rose-600">{r.debet ? formatRupiah(r.debet) : '-'}</td>
                                  <td className="p-1.5 text-right text-emerald-600">{r.kredit ? formatRupiah(r.kredit) : '-'}</td>
                                  <td className="p-1.5 text-right font-bold text-slate-800">{formatRupiah(r.saldo)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {stats && (
                          <div className="text-xs space-y-1 bg-white p-3 rounded-xl border border-slate-200 mt-auto">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Total Kredit:</span>
                              <span className="font-bold text-emerald-700">{formatRupiah(stats.totalMutasiKredit)} ({stats.jumlahMutasiKredit}x)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Total Debet:</span>
                              <span className="font-bold text-rose-700">{formatRupiah(stats.totalMutasiDebet)} ({stats.jumlahMutasiDebet}x)</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-slate-100 font-bold">
                              <span className="text-blue-900">Rata-rata Saldo:</span>
                              <span className="text-blue-900">{formatRupiah(stats.rataRataSaldo)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RekapRekeningPage;
