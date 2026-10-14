import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { pengajuanApi } from '../api/pengajuan';
import { Pengajuan } from '../types';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import {
  Calculator,
  TrendingUp,
  FileSpreadsheet,
  ShieldCheck,
  Building,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [pengajuanList, setPengajuanList] = useState<Pengajuan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await pengajuanApi.getAll();
        setPengajuanList(data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  const totalPlafon = pengajuanList.reduce((acc, p) => acc + (p.plafon_diajukan || 0), 0);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 bg-blue-500/20 px-3 py-1 rounded-full text-xs font-semibold text-blue-200 border border-blue-400/20">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Portal Sistem Analisa Agunan Bank • Versi SPI 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Selamat Datang, {user?.full_name}
          </h1>
          <p className="text-sm text-blue-100/80 leading-relaxed">
            Sistem valuasi agunan tanah otomatis memadukan data pasar internal bank, appraisal KJPP, risalah lelang,
            dan survei lapangan untuk menghasilkan estimasi nilai pasar yang akurat dan dapat diaudit secara transparan.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/valuasi"
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/30 transition card-hover"
            >
              <Calculator className="w-4 h-4" />
              <span>Mulai Analisa Valuasi Baru</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
            <Link
              to="/pengajuan"
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Kelola Pengajuan Kredit</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <DisclaimerBanner />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm card-hover">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Pengajuan Kredit</span>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{pengajuanList.length} Berkas</div>
          <p className="text-[11px] text-slate-400 mt-1">Dalam proses analisa agunan</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm card-hover">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Plafon Fasilitas Diajukan</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {formatRupiah(totalPlafon)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Portofolio kredit berjalan</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm card-hover">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Radius Maksimal Analisa</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">5.000 Meter</div>
          <p className="text-[11px] text-slate-400 mt-1">Pencarian bertahap 500m - 5km</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm card-hover">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Kepatuhan Audit Trail</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">100% Aktif</div>
          <p className="text-[11px] text-slate-400 mt-1">Snapshot JSON & log override</p>
        </div>
      </div>

      {/* Recent Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Pengajuan Kredit Menunggu Analisa Agunan</h3>
            <p className="text-xs text-slate-500">Pilih pengajuan untuk menjalankan kalkulasi nilai pasar di peta.</p>
          </div>
          <Link
            to="/pengajuan"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>Lihat Semua</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">No. Pengajuan</th>
                <th className="px-6 py-3">Nama Debitur</th>
                <th className="px-6 py-3">CIF</th>
                <th className="px-6 py-3">Plafon Diajukan</th>
                <th className="px-6 py-3">Fasilitas Kredit</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pengajuanList.slice(0, 5).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-6 py-3.5 font-bold text-slate-900 font-mono">{p.nomor_pengajuan}</td>
                  <td className="px-6 py-3.5 font-semibold text-slate-800">{p.nama_debitur}</td>
                  <td className="px-6 py-3.5 text-slate-500 font-mono">{p.cif}</td>
                  <td className="px-6 py-3.5 font-mono font-bold text-slate-800">
                    {formatRupiah(p.plafon_diajukan)}
                  </td>
                  <td className="px-6 py-3.5 text-slate-600">{p.jenis_kredit}</td>
                  <td className="px-6 py-3.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <Link
                      to={`/valuasi?pengajuanId=${p.id}`}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] shadow-sm transition"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Analisa di Peta</span>
                    </Link>
                  </td>
                </tr>
              ))}
              {pengajuanList.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Belum ada pengajuan kredit terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
