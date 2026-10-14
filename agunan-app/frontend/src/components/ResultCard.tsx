import React, { useState } from 'react';
import { Valuasi, Agunan } from '../types';
import { ConfidenceBadge } from './ConfidenceBadge';
import {
  TrendingUp,
  ShieldAlert,
  Download,
  CheckCircle,
  FileText,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { valuasiApi } from '../api/valuasi';

interface ResultCardProps {
  valuasi: Valuasi;
  agunan: Agunan;
}

export const ResultCard: React.FC<ResultCardProps> = ({ valuasi, agunan }) => {
  const [isExporting, setIsExporting] = useState(false);

  const formatRupiah = (val?: number | null) => {
    if (val === undefined || val === null) return 'Rp 0';
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      await valuasiApi.downloadPdf(valuasi.id, agunan.kode_agunan);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Gagal mengunduh dokumen PDF. Silakan coba kembali.');
    } finally {
      setIsExporting(false);
    }
  };

  const isLowConfidence = (valuasi.confidence_score ?? 100) < 60;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg overflow-hidden space-y-6 p-6 sm:p-8">
      {/* Header Result */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              Hasil Valuasi Agunan
            </span>
            <span className="text-xs text-slate-400 font-mono">
              VAL-{valuasi.id.toString().padStart(5, '0')}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Indikasi Nilai Pasar & Likuidasi
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          <ConfidenceBadge score={valuasi.confidence_score} size="lg" showDetails />
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all card-hover"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Membuat PDF...' : 'Export PDF (MAK)'}</span>
          </button>
        </div>
      </div>

      {/* Warning Alert if Confidence is Low */}
      {isLowConfidence && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-start space-x-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">PERINGATAN TINGKAT KEYAKINAN RENDAH (Confidence &lt; 60%): </span>
            Tingkat sebaran harga adjusted antar-pembanding cukup tinggi atau radius pencarian melebihi 2 km. 
            Direkomendasikan melakukan peninjauan fisik lapangan mendalam atau menggunakan penilai independen KJPP 
            sebelum persetujuan kredit komite.
          </div>
        </div>
      )}

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Indikasi Nilai Pasar */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-900 to-blue-800 text-white shadow-xl shadow-blue-900/15 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-200 flex items-center space-x-1.5">
            <TrendingUp className="w-4 h-4 text-blue-300" />
            <span>Indikasi Nilai Pasar (Market Value)</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight mt-2">
            {formatRupiah(valuasi.nilai_pasar)}
          </div>
          <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-blue-100">
            <span>Estimasi Rata-Rata Tertimbang:</span>
            <span className="font-mono font-bold">{formatRupiah(valuasi.estimasi_per_m2)} / m²</span>
          </div>
        </div>

        {/* Nilai Likuidasi */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-800 text-white shadow-xl shadow-emerald-900/15 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-200 flex items-center space-x-1.5">
            <ShieldAlert className="w-4 h-4 text-emerald-300" />
            <span>Nilai Likuidasi ({valuasi.haircut_persen || 30}% Haircut)</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight mt-2 text-emerald-300">
            {formatRupiah(valuasi.nilai_likuidasi)}
          </div>
          <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-emerald-100">
            <span>Potongan Risiko Likuidasi Bank:</span>
            <span className="font-mono font-bold">
              {formatRupiah((valuasi.nilai_pasar || 0) - (valuasi.nilai_likuidasi || 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Statistical Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-slate-400 font-medium">Rentang Nilai Terendah</div>
          <div className="font-bold text-slate-800 mt-1 font-mono">{formatRupiah(valuasi.rentang_min)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Batas bawah pasar</div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-slate-400 font-medium">Rentang Nilai Tertinggi</div>
          <div className="font-bold text-slate-800 mt-1 font-mono">{formatRupiah(valuasi.rentang_max)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Batas atas pasar</div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-slate-400 font-medium">Radius Efektif Pencarian</div>
          <div className="font-bold text-slate-800 mt-1">
            {valuasi.radius_efektif_meter && valuasi.radius_efektif_meter >= 1000
              ? `${valuasi.radius_efektif_meter / 1000} km`
              : `${valuasi.radius_efektif_meter || 500} meter`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Kandidat ditemukan: {valuasi.jumlah_kandidat}</div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-slate-400 font-medium">Versi Model & Engine</div>
          <div className="font-bold text-slate-800 mt-1">{valuasi.versi_algoritma}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Standar Penilaian Indonesia</div>
        </div>
      </div>
    </div>
  );
};
