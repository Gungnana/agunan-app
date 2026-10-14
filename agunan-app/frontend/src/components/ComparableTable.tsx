import React, { useState } from 'react';
import { ValuasiPembandingDetail } from '../types';
import { ChevronDown, ChevronUp, RefreshCw, Info, CheckCircle2 } from 'lucide-react';

interface ComparableTableProps {
  comparables: ValuasiPembandingDetail[];
  onOpenOverrideModal?: (compIndex: number) => void;
  canOverride?: boolean;
}

export const ComparableTable: React.FC<ComparableTableProps> = ({
  comparables,
  onOpenOverrideModal,
  canOverride = true,
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getSourceBadge = (sumber?: string) => {
    switch (sumber) {
      case 'LELANG':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'APPRAISAL_KJPP':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'APPRAISAL_INTERNAL':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SURVEI':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'LISTING':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Matriks Analisa Pembanding Pasar</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar 2-3 pembanding berbobot terbaik sesuai prinsip Standar Penilaian Indonesia (SPI).
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 font-medium">
          Total Pembanding Terpilih: <b className="text-blue-700">{comparables.length} Data</b>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-center w-12">No</th>
              <th className="px-4 py-3">Sumber & Kode Ref</th>
              <th className="px-4 py-3 text-right">Jarak</th>
              <th className="px-4 py-3 text-right">Harga Asli/m²</th>
              <th className="px-4 py-3 text-center">Diskon Listing</th>
              <th className="px-4 py-3 text-center">Net Adj (%)</th>
              <th className="px-4 py-3 text-right">Harga Adjusted/m²</th>
              <th className="px-4 py-3 text-center">Skor Kemiripan</th>
              <th className="px-4 py-3 text-center">Bobot</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {comparables.map((comp, idx) => {
              const isExpanded = expandedId === comp.pembanding_id;
              const rincian = comp.rincian_penyesuaian_json || {};

              return (
                <React.Fragment key={comp.pembanding_id || idx}>
                  <tr className={`hover:bg-slate-50/80 transition-colors ${comp.is_override ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-4 py-3.5 text-center">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold inline-flex items-center justify-center text-xs shadow-sm">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{comp.kode_referensi || `ID-${comp.pembanding_id}`}</div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getSourceBadge(comp.sumber)}`}>
                          {comp.sumber}
                        </span>
                        {comp.is_override && (
                          <span className="px-1.5 py-0.2 text-[10px] bg-red-100 text-red-700 font-bold rounded">
                            OVERRIDE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-700">
                      {comp.jarak_meter.toFixed(0)} m
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                      {formatRupiah(comp.harga_asli_per_m2)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {comp.faktor_diskon_penawaran > 0 ? (
                        <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          -{(comp.faktor_diskon_penawaran * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">0%</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold">
                      <span className={comp.total_penyesuaian_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {comp.total_penyesuaian_pct >= 0 ? '+' : ''}
                        {(comp.total_penyesuaian_pct * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-blue-700">
                      {formatRupiah(comp.harga_adjusted_per_m2)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="font-bold text-slate-800">{comp.skor_akhir.toFixed(1)}</div>
                      <div className="text-[10px] text-slate-400">Sumber ×{comp.bobot_sumber}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-700">
                      {(comp.bobot_kontribusi * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => toggleExpand(comp.pembanding_id)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                          title="Lihat rincian 6 faktor penyesuaian"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {canOverride && onOpenOverrideModal && (
                          <button
                            onClick={() => onOpenOverrideModal(idx)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200"
                            title="Ganti dengan pembanding lain"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Ganti</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Breakdown Drawer */}
                  {isExpanded && (
                    <tr className="bg-slate-50/90 border-b border-slate-200">
                      <td colSpan={10} className="px-8 py-3.5">
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                            <Info className="w-3.5 h-3.5 text-blue-600" />
                            <span>Rincian 6 Faktor Penyesuaian Nilai (Standar Penilaian Indonesia):</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <div className="text-[10px] text-slate-400 uppercase font-semibold">1. Waktu</div>
                              <div className="font-bold text-slate-800 mt-0.5">
                                {((rincian.adj_waktu_pct || 0) * 100).toFixed(2)}%
                              </div>
                              <div className="text-[10px] text-slate-500">Usia: {rincian.waktu_bulan || 0} bln</div>
                            </div>

                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <div className="text-[10px] text-slate-400 uppercase font-semibold">2. Lokasi / Jarak</div>
                              <div className="font-bold text-slate-800 mt-0.5">
                                {((rincian.adj_lokasi_pct || 0) * 100).toFixed(2)}%
                              </div>
                              <div className="text-[10px] text-slate-500">Jarak: {rincian.jarak_meter || 0} m</div>
                            </div>

                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <div className="text-[10px] text-slate-400 uppercase font-semibold">3. Luas Tanah</div>
                              <div className="font-bold text-slate-800 mt-0.5">
                                {((rincian.adj_luas_pct || 0) * 100).toFixed(2)}%
                              </div>
                              <div className="text-[10px] text-slate-500">Skala ekonomi</div>
                            </div>

                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <div className="text-[10px] text-slate-400 uppercase font-semibold">4. Lebar Jalan</div>
                              <div className="font-bold text-slate-800 mt-0.5">
                                {((rincian.adj_lebar_jalan_pct || 0) * 100).toFixed(2)}%
                              </div>
                              <div className="text-[10px] text-slate-500">Akses masuk</div>
                            </div>

                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <div className="text-[10px] text-slate-400 uppercase font-semibold">5. Bentuk Tapak</div>
                              <div className="font-bold text-slate-800 mt-0.5">
                                {((rincian.adj_bentuk_pct || 0) * 100).toFixed(2)}%
                              </div>
                              <div className="text-[10px] text-slate-500">Pemanfaatan</div>
                            </div>

                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <div className="text-[10px] text-slate-400 uppercase font-semibold">6. Legalitas</div>
                              <div className="font-bold text-slate-800 mt-0.5">
                                {((rincian.adj_legalitas_pct || 0) * 100).toFixed(2)}%
                              </div>
                              <div className="text-[10px] text-slate-500">Hak kepemilikan</div>
                            </div>
                          </div>

                          {comp.is_override && comp.alasan_override && (
                            <div className="text-xs bg-red-50 text-red-800 p-2 rounded-lg border border-red-200 mt-2 font-medium">
                              <b>Alasan Override:</b> {comp.alasan_override}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
