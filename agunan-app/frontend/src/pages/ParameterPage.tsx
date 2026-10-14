import React, { useState, useEffect } from 'react';
import { parameterApi } from '../api/parameter';
import { ParameterValuasi } from '../types';
import { Sliders, CheckCircle2, ShieldCheck, Info } from 'lucide-react';

export const ParameterPage: React.FC = () => {
  const [parameters, setParameters] = useState<ParameterValuasi[]>([]);
  const [activeParam, setActiveParam] = useState<ParameterValuasi | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchParams = async () => {
      try {
        setIsLoading(true);
        const list = await parameterApi.getAll();
        setParameters(list);
        const active = list.find((p: ParameterValuasi) => p.aktif);
        setActiveParam(active || list[0] || null);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchParams();
  }, []);

  const handleActivate = async (id: number) => {
    try {
      await parameterApi.activate(id);
      const list = await parameterApi.getAll();
      setParameters(list);
      const active = list.find((p: ParameterValuasi) => p.aktif);
      setActiveParam(active || null);
      alert('Versi parameter berhasil diaktifkan.');
    } catch (err) {
      console.error(err);
      alert('Gagal mengaktifkan parameter.');
    }
  };

  const paramData = activeParam?.parameter_json || {};

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            Tata Kelola Model
          </span>
          <span className="text-xs text-slate-400">• Parameter Valuasi Dinamis</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
          Konfigurasi Parameter Valuasi Agunan (SPI)
        </h1>
        <p className="text-xs text-slate-500">
          Seluruh persentase diskon, haircut, dan bobot matriks penyesuaian dibaca secara dinamis dari tabel parameter, 
          tanpa hardcode di dalam mesin aplikasi.
        </p>
      </div>

      {/* Active Version Highlight Card */}
      {activeParam && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  VERSI AKTIF
                </span>
                <span className="font-mono text-xs font-bold text-slate-600">{activeParam.versi}</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-1">{activeParam.judul}</h2>
              <p className="text-xs text-slate-500">Berlaku efektif sejak: {activeParam.berlaku_dari}</p>
            </div>
            <div className="text-xs text-slate-500">
              Dibuat oleh: <b>{activeParam.created_by}</b>
            </div>
          </div>

          {/* Grid Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            {/* 1. Core Discounts & Haircuts */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Diskon & Haircut Dasar</span>
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-white rounded-xl border border-slate-100">
                  <span className="text-slate-600">Diskon Penawaran Listing:</span>
                  <span className="font-bold text-amber-700 font-mono">
                    {((paramData.diskon_penawaran_pct || 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded-xl border border-slate-100">
                  <span className="text-slate-600">Haircut Nilai Likuidasi:</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    {((paramData.haircut_likuidasi_pct || 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded-xl border border-slate-100">
                  <span className="text-slate-600">Inflasi Tren Waktu:</span>
                  <span className="font-bold text-blue-700 font-mono">
                    {((paramData.penyesuaian_waktu?.inflasi_tahunan_pct || 0) * 100).toFixed(1)}% / thn
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Physical & Spatial Factors */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Faktor Fisik & Spasial</span>
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-white rounded-xl border border-slate-100">
                  <span className="text-slate-600">Penalti Jarak per km:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {((paramData.penyesuaian_lokasi?.faktor_jarak_per_km_pct || 0) * 100).toFixed(1)}% / km
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded-xl border border-slate-100">
                  <span className="text-slate-600">Elastisitas Skala Luas:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {paramData.penyesuaian_luas?.elastisitas_luas || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded-xl border border-slate-100">
                  <span className="text-slate-600">Akses Lebar Jalan per m:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {((paramData.penyesuaian_lebar_jalan?.faktor_per_meter_pct || 0) * 100).toFixed(1)}% / m
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Data Source Weights */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Bobot Sumber Data</span>
              </h3>
              <div className="space-y-1.5">
                {Object.entries(paramData.bobot_sumber_data || {}).map(([sumber, bobot]) => (
                  <div key={sumber} className="flex justify-between items-center p-1.5 bg-white rounded-lg border border-slate-100">
                    <span className="text-slate-600">{sumber}:</span>
                    <span className="font-bold font-mono text-purple-700">{String(bobot)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm">Riwayat Versi Parameter Valuasi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b">
              <tr>
                <th className="px-6 py-3">Versi</th>
                <th className="px-6 py-3">Deskripsi Judul</th>
                <th className="px-6 py-3">Berlaku Dari</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parameters.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3.5 font-bold font-mono text-slate-900">{p.versi}</td>
                  <td className="px-6 py-3.5 font-medium text-slate-800">{p.judul}</td>
                  <td className="px-6 py-3.5 text-slate-500">{p.berlaku_dari}</td>
                  <td className="px-6 py-3.5">
                    {p.aktif ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        AKTIF
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                        NONAKTIF
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {!p.aktif && (
                      <button
                        onClick={() => handleActivate(p.id)}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition"
                      >
                        Aktifkan
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
