import React, { useState } from 'react';
import { ValuasiPembandingDetail, Pembanding } from '../types';
import { X, RefreshCw, AlertCircle, Check } from 'lucide-react';

interface OverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSelected: ValuasiPembandingDetail[];
  allCandidates: any[];
  onConfirmOverride: (selectedIds: number[], reason: string) => Promise<void>;
}

export const OverrideModal: React.FC<OverrideModalProps> = ({
  isOpen,
  onClose,
  currentSelected,
  allCandidates,
  onConfirmOverride,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>(
    currentSelected.map((c) => c.pembanding_id)
  );
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length <= 2) {
        setErrorMsg('Minimal harus memilih 2 pembanding.');
        return;
      }
      setSelectedIds(selectedIds.filter((item) => item !== id));
      setErrorMsg(null);
    } else {
      if (selectedIds.length >= 3) {
        setErrorMsg('Maksimal dapat memilih 3 pembanding.');
        return;
      }
      setSelectedIds([...selectedIds, id]);
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setErrorMsg('Alasan override wajib diisi minimal 10 karakter yang jelas.');
      return;
    }
    if (selectedIds.length < 2 || selectedIds.length > 3) {
      setErrorMsg('Harap pilih antara 2 hingga 3 data pembanding.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onConfirmOverride(selectedIds, reason);
      onClose();
    } catch (err: any) {
      console.error('Error override:', err);
      setErrorMsg(err.response?.data?.detail || 'Gagal menyimpan perubahan override pembanding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Override Pembanding Pasar</h3>
              <p className="text-xs text-slate-500">Pilih 2-3 pembanding dan cantumkan alasan profesional.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* List Candidates */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Kandidat Pembanding Tersedia ({selectedIds.length}/3 dipilih):
              </label>
              <span className="text-[11px] text-slate-500">Wajib pilih 2 s/d 3 kandidat</span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
              {allCandidates.map((cand) => {
                const isSelected = selectedIds.includes(cand.id);
                return (
                  <div
                    key={cand.id}
                    onClick={() => toggleSelect(cand.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{cand.kode_referensi || `ID-${cand.id}`}</span>
                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">
                          {cand.sumber}
                        </span>
                        <span className="text-slate-400">Jarak: {cand.jarak_meter?.toFixed(0) || '-'} m</span>
                      </div>
                      <div className="text-slate-600">
                        Harga: <b className="font-mono">{formatRupiah(cand.harga_per_m2)}/m²</b> • Luas: {cand.luas_tanah} m² • Jalan: {cand.lebar_jalan} m
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reason Field */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="reason" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Alasan Profesional Override <span className="text-red-500">*</span>
              </label>
              <span
                className={`text-[11px] font-mono ${
                  reason.trim().length >= 10 ? 'text-emerald-600 font-bold' : 'text-slate-400'
                }`}
              >
                {reason.trim().length}/10 karakter minimum
              </span>
            </div>
            <textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Mengganti pembanding #3 karena kondisi fisik lahan di lapangan berhadapan langsung dengan akses jalan arteri utama dan memiliki kontur yang lebih sebanding dengan agunan."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              * Alasan ini akan tercatat permanen di Audit Log Kepatuhan dan Dokumen Lampiran MAK.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 10 || selectedIds.length < 2}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-xl shadow-md shadow-blue-600/20 transition card-hover"
            >
              {isSubmitting ? 'Menyimpan...' : 'Terapkan Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
