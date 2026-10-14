import React, { useState, useEffect } from 'react';
import { pembandingApi } from '../api/pembanding';
import { Pembanding, SumberData, JenisHarga } from '../types';
import {
  Database,
  Upload,
  Search,
  Filter,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  MapPin,
  RefreshCw,
} from 'lucide-react';

export const ComparableDatabasePage: React.FC = () => {
  const [comparables, setComparables] = useState<Pembanding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sumberFilter, setSumberFilter] = useState<string>('');
  const [kotaSearch, setKotaSearch] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const fetchComparables = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, any> = {};
      if (sumberFilter) params.sumber = sumberFilter;
      if (kotaSearch) params.kota = kotaSearch;
      const data = await pembandingApi.getAll(params);
      setComparables(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComparables();
  }, [sumberFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComparables();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadMessage(null);
      const res = await pembandingApi.importInternal(file);
      setUploadMessage(
        `Sukses mengimpor ${res.summary?.berhasil_diimpor} data. (Presisi rendah: ${res.summary?.ditandai_presisi_rendah})`
      );
      await fetchComparables();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Gagal memproses file ETL import.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  const getSourceBadge = (sumber: string) => {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Tabel Kanonik
            </span>
            <span className="text-xs text-slate-400">• Database Pembanding Multi-Sumber</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Database Harga Pasar Pembanding
          </h1>
          <p className="text-xs text-slate-500">
            Kumpulan data harga tanah internal bank, appraisal KJPP rekanan, risalah lelang, survei lapangan, dan listing.
          </p>
        </div>

        {/* Upload ETL Action */}
        <div>
          <label className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition cursor-pointer card-hover">
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'Memproses ETL...' : 'Import Data Internal (CSV/Excel)'}</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      {uploadMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{uploadMessage}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan kota / kabupaten..."
              value={kotaSearch}
              onChange={(e) => setKotaSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl"
          >
            Cari
          </button>
        </form>

        <div className="flex items-center space-x-2">
          <span className="text-slate-500 font-semibold flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1" /> Sumber:
          </span>
          <select
            value={sumberFilter}
            onChange={(e) => setSumberFilter(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-200 bg-white"
          >
            <option value="">Semua Sumber</option>
            <option value="APPRAISAL_KJPP">Appraisal KJPP</option>
            <option value="APPRAISAL_INTERNAL">Appraisal Internal</option>
            <option value="LELANG">Lelang Eksekusi</option>
            <option value="SURVEI">Survei Lapangan</option>
            <option value="LISTING">Listing Properti</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Kode Ref</th>
                <th className="px-5 py-3">Sumber Data</th>
                <th className="px-5 py-3">Kota / Wilayah</th>
                <th className="px-5 py-3">Alamat</th>
                <th className="px-5 py-3 text-right">Luas</th>
                <th className="px-5 py-3 text-right">Harga/m²</th>
                <th className="px-5 py-3 text-center">Tanggal</th>
                <th className="px-5 py-3 text-center">Hak</th>
                <th className="px-5 py-3 text-center">Geocode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparables.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-5 py-3.5 font-bold text-slate-900 font-mono">{c.kode_referensi}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getSourceBadge(c.sumber)}`}>
                      {c.sumber}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{c.kota_kabupaten}</td>
                  <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">{c.alamat}</td>
                  <td className="px-5 py-3.5 text-right font-medium text-slate-800">{c.luas_tanah} m²</td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-blue-700">
                    {formatRupiah(c.harga_per_m2)}
                  </td>
                  <td className="px-5 py-3.5 text-center text-slate-500">{c.tanggal_data}</td>
                  <td className="px-5 py-3.5 text-center font-semibold text-slate-700">{c.legalitas}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                      {c.kualitas_geocode}
                    </span>
                  </td>
                </tr>
              ))}
              {comparables.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    Tidak ada data pembanding yang sesuai kriteria pencarian.
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
