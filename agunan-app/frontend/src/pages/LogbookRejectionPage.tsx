import React, { useState, useEffect, useMemo } from 'react';
import {
  UserX,
  Plus,
  FileSpreadsheet,
  Search,
  X,
  CheckCircle2,
  Calendar,
  Building2,
  RotateCcw,
  Edit2,
  Trash2,
  Eye,
  Info,
  Building,
  User,
  ShieldAlert,
  FileText,
  Printer,
  Globe,
} from 'lucide-react';
import { RejectionLogItem } from '../types/rejectionLog';
import { rejectionLogApi, computeRejectionStats } from '../api/rejectionLogApi';
import { exportRejectionLogToExcel } from '../utils/exportRejectionExcel';
import { downloadMemoPenolakanPdf } from '../utils/generateMemoPdf';
import { CustomerProfileSearchModal } from '../components/CustomerProfileSearchModal';

const formatRupiah = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
};

export const LogbookRejectionPage: React.FC = () => {
  const [items, setItems] = useState<RejectionLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedJenisKredit, setSelectedJenisKredit] = useState<string>('ALL');
  const [selectedKapasitas, setSelectedKapasitas] = useState<string>('ALL');
  const [selectedKantor, setSelectedKantor] = useState<string>('ALL');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<RejectionLogItem | null>(null);
  const [detailItem, setDetailItem] = useState<RejectionLogItem | null>(null);
  const [profileSearchItem, setProfileSearchItem] = useState<RejectionLogItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const handleGenerateMemo = async (item: RejectionLogItem) => {
    try {
      setIsGeneratingPdf(true);
      showToast(`Membuat Memo Penolakan untuk ${item.nama}...`);
      await downloadMemoPenolakanPdf(item);
      showToast(`Memo Penolakan ${item.nama} (F4) berhasil diunduh!`);
    } catch (err: any) {
      console.error('Error generating memo PDF:', err);
      alert('Gagal membuat memo penolakan: ' + (err.message || 'Terjadi kesalahan sistem.'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleUpdateNegativeInfoFromSearch = async (targetItem: RejectionLogItem, newInfo: string) => {
    try {
      await rejectionLogApi.update(targetItem.id, { informasi_negatif: newInfo });
      setItems((prev) =>
        prev.map((i) => (i.id === targetItem.id ? { ...i, informasi_negatif: newInfo } : i))
      );
      if (detailItem && detailItem.id === targetItem.id) {
        setDetailItem({ ...detailItem, informasi_negatif: newInfo });
      }
      if (profileSearchItem && profileSearchItem.id === targetItem.id) {
        setProfileSearchItem({ ...profileSearchItem, informasi_negatif: newInfo });
      }
      showToast(`Informasi negatif nasabah ${targetItem.nama} berhasil diperbarui.`);
    } catch (err) {
      console.error('Gagal memperbarui info negatif:', err);
      alert('Gagal memperbarui catatan informasi negatif.');
    }
  };

  // Form State according to BPR Bank Kertiawan row fields
  const [formData, setFormData] = useState({
    nik_npwp: '',
    no_permohonan: '',
    nama: '',
    alamat: '',
    tanggal_pengajuan: new Date().toLocaleDateString('id-ID'),
    plafon_pengajuan: 500000000,
    jenis_kredit: 'MODAL KERJA',
    peruntukan_kredit: '',
    alasan_ditolak: '',
    kapasitas: 'TOLAK',
    jaminan: 'SHM',
    informasi_negatif: '-',
    kantor: 'Kuta',
    kepala_cabang: 'Yudhi Novianto,.S.E',
    analis: 'I Putu Dimas Adiputra',
    tanggal_ditolak: new Date().toLocaleDateString('id-ID'),
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await rejectionLogApi.getAll();
      setItems(data);
    } catch (err) {
      console.error('Error loading rejection log:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        term === '' ||
        item.nama.toLowerCase().includes(term) ||
        (item.nik_npwp && item.nik_npwp.toLowerCase().includes(term)) ||
        (item.no_permohonan && item.no_permohonan.toLowerCase().includes(term)) ||
        (item.alamat && item.alamat.toLowerCase().includes(term)) ||
        item.alasan_ditolak.toLowerCase().includes(term) ||
        (item.peruntukan_kredit && item.peruntukan_kredit.toLowerCase().includes(term));

      const matchJenis = selectedJenisKredit === 'ALL' || item.jenis_kredit === selectedJenisKredit;
      const matchKapasitas = selectedKapasitas === 'ALL' || item.kapasitas === selectedKapasitas;
      const matchKantor = selectedKantor === 'ALL' || item.kantor === selectedKantor;

      return matchSearch && matchJenis && matchKapasitas && matchKantor;
    });
  }, [items, searchTerm, selectedJenisKredit, selectedKapasitas, selectedKantor]);

  // Statistics
  const stats = useMemo(() => computeRejectionStats(items), [items]);

  // Unique lists for dropdowns
  const jenisKreditOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.jenis_kredit && i.jenis_kredit !== '-') set.add(i.jenis_kredit);
    });
    return Array.from(set);
  }, [items]);

  const kapasitasOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.kapasitas && i.kapasitas !== '-') set.add(i.kapasitas);
    });
    return Array.from(set);
  }, [items]);

  const kantorOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.kantor && i.kantor !== '-') set.add(i.kantor);
    });
    return Array.from(set);
  }, [items]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      nik_npwp: '',
      no_permohonan: '',
      nama: '',
      alamat: '',
      tanggal_pengajuan: new Date().toLocaleDateString('id-ID'),
      plafon_pengajuan: 500000000,
      jenis_kredit: 'MODAL KERJA',
      peruntukan_kredit: '',
      alasan_ditolak: 'KAPASITAS',
      kapasitas: 'TOLAK',
      jaminan: 'SHM',
      informasi_negatif: '-',
      kantor: 'Kuta',
      kepala_cabang: 'Yudhi Novianto,.S.E',
      analis: 'I Putu Dimas Adiputra',
      tanggal_ditolak: new Date().toLocaleDateString('id-ID'),
    });
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: RejectionLogItem) => {
    setEditingItem(item);
    setFormData({
      nik_npwp: item.nik_npwp || '',
      no_permohonan: item.no_permohonan || '',
      nama: item.nama,
      alamat: item.alamat || '',
      tanggal_pengajuan: item.tanggal_pengajuan || '',
      plafon_pengajuan: item.plafon_pengajuan,
      jenis_kredit: item.jenis_kredit,
      peruntukan_kredit: item.peruntukan_kredit || '',
      alasan_ditolak: item.alasan_ditolak,
      kapasitas: item.kapasitas,
      jaminan: item.jaminan || 'SHM',
      informasi_negatif: item.informasi_negatif || '-',
      kantor: item.kantor || 'KPO',
      kepala_cabang: item.kepala_cabang || '',
      analis: item.analis || '',
      tanggal_ditolak: item.tanggal_ditolak || '',
    });
    setIsFormOpen(true);
  };

  // Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      alert('Nama nasabah wajib diisi.');
      return;
    }
    if (!formData.alasan_ditolak.trim()) {
      alert('Alasan ditolak wajib diisi.');
      return;
    }

    try {
      if (editingItem) {
        await rejectionLogApi.update(editingItem.id, formData);
        showToast(`Data penolakan "${formData.nama}" berhasil diperbarui.`);
      } else {
        await rejectionLogApi.create(formData);
        showToast(`Data penolakan "${formData.nama}" berhasil ditambahkan ke logbook.`);
      }
      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      alert('Gagal menyimpan data: ' + (err.message || 'Terjadi kesalahan sistem.'));
    }
  };

  // Delete
  const handleDelete = async (item: RejectionLogItem) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus data penolakan nasabah "${item.nama}"?`
    );
    if (!confirmDelete) return;

    try {
      await rejectionLogApi.delete(item.id);
      showToast(`Data penolakan "${item.nama}" telah dihapus.`);
      loadData();
    } catch (err: any) {
      alert('Gagal menghapus: ' + (err.message || 'Terjadi kesalahan.'));
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const blob = await exportRejectionLogToExcel(filteredItems);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `Daftar_Permohonan_Ditolak_BPR_Bank_Kertiawan_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('File Excel Daftar Permohonan Ditolak berhasil diunduh.');
    } catch (err) {
      console.error(err);
      alert('Gagal mengekspor file Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  // Reset to seed demo data
  const handleResetSeed = () => {
    const confirmReset = window.confirm(
      'Kembalikan daftar ke data penolakan awal BPR Bank Kertiawan (22 data)?'
    );
    if (confirmReset) {
      rejectionLogApi.resetToSeed();
      loadData();
      showToast('Data logbook telah dikembalikan ke data resmi BPR Bank Kertiawan.');
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-6 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-md shadow-2xl border border-slate-700 flex items-center space-x-3 text-xs sm:text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner - Sesuai File Penolakan BPR Bank Kertiawan */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-lg p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Daftar Permohonan Ditolak </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportExcel}
              disabled={isExporting || items.length === 0}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs sm:text-sm font-bold shadow-lg shadow-emerald-700/20 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExporting ? 'Mengekspor...' : 'Export Excel (.xlsx)'}</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Input Nasabah Ditolak</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-md p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Permohonan</span>
            <div className="w-9 h-9 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {stats.totalRejections}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Berkas penolakan terdaftar di sistem
          </p>
        </div>

        <div className="bg-white rounded-md p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Plafon Ditolak</span>
            <div className="w-9 h-9 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="font-bold text-sm">Rp</span>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono truncate">
            {formatRupiah(stats.totalPlafon)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Akumulasi permohonan kredit yang ditolak
          </p>
        </div>

        <div className="bg-white rounded-md p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Status Kapasitas</span>
            <div className="w-9 h-9 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-800">
            TOLAK: {stats.byKapasitas['TOLAK'] || 0}
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-2">
            <span>Diterima: {stats.byKapasitas['DITERIMA'] || 0}</span>
            <span>·</span>
            <span>Batal: {stats.byKapasitas['BATAL PENGAJUAN'] || 0}</span>
          </div>
        </div>

        <div className="bg-white rounded-md p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Unit / Kantor</span>
            <div className="w-9 h-9 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-800">
            KPO & Cabang Kuta
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Sistem Bank Kertiawan Terintegrasi
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-md p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, NIK/NPWP, No Permohonan, alamat, peruntukan, alasan ditolak..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Jenis Kredit Filter */}
          <div className="w-full md:w-56">
            <select
              value={selectedJenisKredit}
              onChange={(e) => setSelectedJenisKredit(e.target.value)}
              className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Jenis Kredit</option>
              {jenisKreditOptions.map((jk) => (
                <option key={jk} value={jk}>
                  {jk}
                </option>
              ))}
            </select>
          </div>

          {/* Kapasitas Filter */}
          <div className="w-full md:w-52">
            <select
              value={selectedKapasitas}
              onChange={(e) => setSelectedKapasitas(e.target.value)}
              className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Status Kapasitas</option>
              {kapasitasOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {/* Kantor Filter */}
          <div className="w-full md:w-48">
            <select
              value={selectedKantor}
              onChange={(e) => setSelectedKantor(e.target.value)}
              className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="ALL">Semua Kantor</option>
              {kantorOptions.map((kt) => (
                <option key={kt} value={kt}>
                  {kt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter status row */}
        <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-bold text-slate-800">{filteredItems.length}</span> dari{' '}
            <span className="font-bold text-slate-800">{items.length}</span> permohonan
          </div>
          {(searchTerm || selectedJenisKredit !== 'ALL' || selectedKapasitas !== 'ALL' || selectedKantor !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedJenisKredit('ALL');
                setSelectedKapasitas('ALL');
                setSelectedKantor('ALL');
              }}
              className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card - Matching Exactly BPR Bank Kertiawan Columns */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-medium">Memuat data permohonan ditolak...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-md bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <UserX className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-800">Tidak ada data penolakan yang sesuai</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Coba sesuaikan kata kunci pencarian atau ubah filter di atas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-3 text-center border-r border-slate-200 w-10">NO</th>
                  <th className="py-3 px-3 border-r border-slate-200">NIK/NPWP</th>
                  <th className="py-3 px-3 border-r border-slate-200">NO. PERMOHONAN</th>
                  <th className="py-3 px-3 border-r border-slate-200">NAMA</th>
                  <th className="py-3 px-3 border-r border-slate-200 max-w-[200px] truncate">ALAMAT</th>
                  <th className="py-3 px-3 border-r border-slate-200">TGL PENGAJUAN</th>
                  <th className="py-3 px-3 border-r border-slate-200 text-right">PLAFON PENGAJUAN</th>
                  <th className="py-3 px-3 border-r border-slate-200">JENIS KREDIT</th>
                  <th className="py-3 px-3 border-r border-slate-200">PERUNTUKAN KREDIT</th>
                  <th className="py-3 px-3 border-r border-slate-200 max-w-[250px]">ALASAN DITOLAK</th>
                  <th className="py-3 px-3 border-r border-slate-200 text-center">KAPASITAS</th>
                  <th className="py-3 px-3 border-r border-slate-200 text-center">JAMINAN</th>
                  <th className="py-3 px-3 border-r border-slate-200">INFORMASI NEGATIF</th>
                  <th className="py-3 px-3 border-r border-slate-200">KANTOR</th>
                  <th className="py-3 px-3 border-r border-slate-200">KEPALA CABANG</th>
                  <th className="py-3 px-3 border-r border-slate-200">ANALIS</th>
                  <th className="py-3 px-3 border-r border-slate-200">TGL DITOLAK</th>
                  <th className="py-3 px-3 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item, idx) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 transition-all"
                    >
                      {/* NO */}
                      <td className="py-3 px-3 text-center text-slate-500 font-mono border-r border-slate-100">
                        {idx + 1}
                      </td>

                      {/* NIK / NPWP */}
                      <td className="py-3 px-3 font-mono text-slate-800 border-r border-slate-100">
                        {item.nik_npwp || '-'}
                      </td>

                      {/* NO. PERMOHONAN */}
                      <td className="py-3 px-3 font-mono text-center text-slate-700 border-r border-slate-100">
                        {item.no_permohonan || '-'}
                      </td>

                      {/* NAMA */}
                      <td className="py-3 px-3 font-bold text-slate-900 border-r border-slate-100">
                        {item.nama}
                      </td>

                      {/* ALAMAT */}
                      <td className="py-3 px-3 text-slate-600 max-w-[220px] truncate border-r border-slate-100" title={item.alamat}>
                        {item.alamat || '-'}
                      </td>

                      {/* TANGGAL PENGAJUAN */}
                      <td className="py-3 px-3 text-center text-slate-600 border-r border-slate-100">
                        {item.tanggal_pengajuan || '-'}
                      </td>

                      {/* PLAFON PENGAJUAN */}
                      <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono border-r border-slate-100">
                        {formatRupiah(item.plafon_pengajuan)}
                      </td>

                      {/* JENIS KREDIT */}
                      <td className="py-3 px-3 border-r border-slate-100">
                        <span className="px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-800 text-[10px]">
                          {item.jenis_kredit}
                        </span>
                      </td>

                      {/* PERUNTUKAN KREDIT */}
                      <td className="py-3 px-3 text-slate-700 border-r border-slate-100">
                        {item.peruntukan_kredit || '-'}
                      </td>

                      {/* ALASAN DITOLAK */}
                      <td className="py-3 px-3 text-slate-800 max-w-[260px] truncate border-r border-slate-100" title={item.alasan_ditolak}>
                        <span className="text-rose-600 font-semibold">{item.alasan_ditolak}</span>
                      </td>

                      {/* KAPASITAS */}
                      <td className="py-3 px-3 text-center border-r border-slate-100">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.kapasitas === 'DITERIMA'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.kapasitas === 'BATAL PENGAJUAN'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                          }`}>
                          {item.kapasitas}
                        </span>
                      </td>

                      {/* JAMINAN */}
                      <td className="py-3 px-3 text-center font-medium text-slate-700 border-r border-slate-100">
                        {item.jaminan || '-'}
                      </td>

                      {/* INFORMASI NEGATIF */}
                      <td className="py-3 px-3 text-slate-600 max-w-[180px] truncate border-r border-slate-100" title={item.informasi_negatif}>
                        {item.informasi_negatif || '-'}
                      </td>

                      {/* KANTOR */}
                      <td className="py-3 px-3 text-slate-700 border-r border-slate-100">
                        {item.kantor || '-'}
                      </td>

                      {/* KEPALA CABANG */}
                      <td className="py-3 px-3 text-slate-700 border-r border-slate-100">
                        {item.kepala_cabang || '-'}
                      </td>

                      {/* ANALIS */}
                      <td className="py-3 px-3 text-slate-700 border-r border-slate-100">
                        {item.analis || '-'}
                      </td>

                      {/* TANGGAL DITOLAK */}
                      <td className="py-3 px-3 text-center text-slate-600 border-r border-slate-100">
                        {item.tanggal_ditolak || '-'}
                      </td>

                      {/* AKSI */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleGenerateMemo(item)}
                            title="Generate Memo Penolakan (PDF F4)"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <FileText className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                          <button
                            onClick={() => setProfileSearchItem(item)}
                            title="Cari Profil & Jejak Digital Internet (OSINT)"
                            className="p-1 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded"
                          >
                            <Globe className="w-3.5 h-3.5 text-violet-500" />
                          </button>
                          <button
                            onClick={() => setDetailItem(item)}
                            title="Lihat Detail"
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Edit"
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            title="Hapus"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info & demo reset */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-slate-400" />
            <span>
              Format tabel disesuaikan 100% dengan formulir Daftar Permohonan Ditolak BPR Bank Kertiawan.
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetSeed}
            className="text-slate-500 hover:text-slate-800 underline font-semibold flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke 22 Data Resmi Bank Kertiawan</span>
          </button>
        </div>
      </div>

      {/* Modal Form: Input / Edit Data Nasabah Ditolak */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-4xl w-full my-8 overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-md bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center justify-center">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">
                    {editingItem ? 'Edit Permohonan Ditolak' : 'Input Permohonan Ditolak (BPR Bank Kertiawan)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Masukkan data nasabah sesuai dengan format row formulir penolakan kredit
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSave} className="p-6 space-y-6 text-xs sm:text-sm max-h-[80vh] overflow-y-auto">
              {/* Row 1: NIK/NPWP, No Permohonan, Nama */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">NIK/NPWP</label>
                  <input
                    type="text"
                    placeholder="Contoh: 5171026001750002"
                    value={formData.nik_npwp}
                    onChange={(e) => setFormData({ ...formData, nik_npwp: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">No. Permohonan</label>
                  <input
                    type="text"
                    placeholder="Contoh: 111 / 102"
                    value={formData.no_permohonan}
                    onChange={(e) => setFormData({ ...formData, no_permohonan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Nama Nasabah / Perusahaan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: NI KETUT SEKARINI"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Alamat, Tanggal Pengajuan, Plafon Pengajuan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-slate-600 font-semibold mb-1">Alamat</label>
                  <input
                    type="text"
                    placeholder="Contoh: Desa Peguyangan Kangin..."
                    value={formData.alamat}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Tanggal Pengajuan</label>
                  <input
                    type="text"
                    placeholder="Contoh: 23/2/2026"
                    value={formData.tanggal_pengajuan}
                    onChange={(e) => setFormData({ ...formData, tanggal_pengajuan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Plafon Pengajuan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000000}
                    value={formData.plafon_pengajuan}
                    onChange={(e) =>
                      setFormData({ ...formData, plafon_pengajuan: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="text-[11px] text-blue-600 mt-0.5 font-semibold">
                    {formatRupiah(formData.plafon_pengajuan)}
                  </div>
                </div>
              </div>

              {/* Row 3: Jenis Kredit & Peruntukan Kredit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Jenis Kredit <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.jenis_kredit}
                    onChange={(e) => setFormData({ ...formData, jenis_kredit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="MODAL KERJA">MODAL KERJA</option>
                    <option value="INVESTASI">INVESTASI</option>
                    <option value="KONSUMTIF/MULTIGUNA">KONSUMTIF/MULTIGUNA</option>
                    <option value="KPR">KPR</option>
                    <option value="KONSUMTIF/KPR">KONSUMTIF/KPR</option>
                    <option value="KTA/MODAL KERJA">KTA/MODAL KERJA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Peruntukan Kredit</label>
                  <input
                    type="text"
                    placeholder="Contoh: REFINANCING KREDIT / PEMBIAYAAN PROJECT / TAMBAHAN MODAL"
                    value={formData.peruntukan_kredit}
                    onChange={(e) => setFormData({ ...formData, peruntukan_kredit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Alasan Ditolak & Kapasitas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Alasan Ditolak (Detail) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Contoh: Kapasitas lemah, pendapatan tidak tercermin dan jaminan tidak mengcover rasio..."
                    value={formData.alasan_ditolak}
                    onChange={(e) => setFormData({ ...formData, alasan_ditolak: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  ></textarea>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Kapasitas <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.kapasitas}
                      onChange={(e) => setFormData({ ...formData, kapasitas: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="TOLAK">TOLAK</option>
                      <option value="DITERIMA">DITERIMA</option>
                      <option value="DIPERTIMBANGKAN">DIPERTIMBANGKAN</option>
                      <option value="BATAL PENGAJUAN">BATAL PENGAJUAN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Jaminan</label>
                    <input
                      type="text"
                      placeholder="Contoh: SHM / SHM & BPKB"
                      value={formData.jaminan}
                      onChange={(e) => setFormData({ ...formData, jaminan: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Informasi Negatif */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Informasi Negatif</label>
                <input
                  type="text"
                  placeholder="Contoh: Pernah memiliki masalah dengan warga lingkungan perumahan / 1 SHM & Mobil Splash / -"
                  value={formData.informasi_negatif}
                  onChange={(e) => setFormData({ ...formData, informasi_negatif: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Row 6: Kantor, Kepala Cabang, Analis, Tanggal Ditolak */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Kantor</label>
                  <input
                    type="text"
                    placeholder="Contoh: Kuta / KPO"
                    value={formData.kantor}
                    onChange={(e) => setFormData({ ...formData, kantor: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Kepala Cabang</label>
                  <input
                    type="text"
                    placeholder="Contoh: Yudhi Novianto,.S.E"
                    value={formData.kepala_cabang}
                    onChange={(e) => setFormData({ ...formData, kepala_cabang: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Analis</label>
                  <input
                    type="text"
                    placeholder="Contoh: I Putu Dimas Adiputra"
                    value={formData.analis}
                    onChange={(e) => setFormData({ ...formData, analis: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Tanggal Ditolak</label>
                  <input
                    type="text"
                    placeholder="Contoh: 23/3/2026"
                    value={formData.tanggal_ditolak}
                    onChange={(e) => setFormData({ ...formData, tanggal_ditolak: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 rounded-md border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-all text-xs sm:text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30 transition-all text-xs sm:text-sm flex items-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingItem ? 'Simpan Perubahan' : 'Simpan Data Penolakan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Dossier */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono text-rose-400 font-bold">
                  BPR BANK KERTIAWAN - BERKAS PENOLAKAN
                </div>
                <h3 className="text-lg font-bold">{detailItem.nama}</h3>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-md border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400">NIK / NPWP:</span>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">{detailItem.nik_npwp || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-400">No. Permohonan:</span>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">{detailItem.no_permohonan || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Plafon Pengajuan:</span>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">{formatRupiah(detailItem.plafon_pengajuan)}</div>
                </div>
                <div>
                  <span className="text-slate-400">Jenis Kredit:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{detailItem.jenis_kredit}</div>
                </div>
                <div>
                  <span className="text-slate-400">Peruntukan:</span>
                  <div className="text-slate-800 mt-0.5">{detailItem.peruntukan_kredit || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Kapasitas:</span>
                  <div className="font-bold text-rose-600 mt-0.5">{detailItem.kapasitas}</div>
                </div>
                <div>
                  <span className="text-slate-400">Jaminan:</span>
                  <div className="text-slate-800 mt-0.5">{detailItem.jaminan || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Kantor:</span>
                  <div className="text-slate-800 mt-0.5">{detailItem.kantor || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Tanggal Ditolak:</span>
                  <div className="text-slate-800 mt-0.5">{detailItem.tanggal_ditolak || '-'}</div>
                </div>
              </div>

              {detailItem.alamat && (
                <div className="p-3 bg-slate-50 rounded-md border border-slate-100 text-xs">
                  <span className="text-slate-400 font-medium">Alamat:</span>
                  <div className="text-slate-800 mt-0.5">{detailItem.alamat}</div>
                </div>
              )}

              <div className="space-y-1">
                <span className="font-bold text-slate-700 uppercase tracking-wide text-xs">
                  Alasan Detail Ditolak:
                </span>
                <div className="p-4 bg-rose-50/70 rounded-md border border-rose-200 text-slate-900 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {detailItem.alasan_ditolak}
                </div>
              </div>

              {detailItem.informasi_negatif && detailItem.informasi_negatif !== '-' && (
                <div className="space-y-1">
                  <span className="font-bold text-slate-700 uppercase tracking-wide text-xs">
                    Informasi Negatif:
                  </span>
                  <div className="p-3.5 bg-amber-50/70 rounded-md border border-amber-200 text-amber-900 text-xs leading-relaxed">
                    {detailItem.informasi_negatif}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400">Kepala Cabang:</span>
                  <div className="font-bold text-slate-800 mt-0.5">{detailItem.kepala_cabang || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Analis:</span>
                  <div className="font-bold text-slate-800 mt-0.5">{detailItem.analis || '-'}</div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateMemo(detailItem)}
                    disabled={isGeneratingPdf}
                    className="px-4 py-2.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{isGeneratingPdf ? 'Membuat Memo...' : 'Cetak Memo Penolakan (PDF F4)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProfileSearchItem(detailItem)}
                    className="px-4 py-2.5 rounded-md bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-violet-600/20 transition-all"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Cari Profil & Jejak Digital Internet</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailItem(null)}
                  className="px-5 py-2.5 rounded-md bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Profile & OSINT Internet Search Modal */}
      {profileSearchItem && (
        <CustomerProfileSearchModal
          isOpen={!!profileSearchItem}
          onClose={() => setProfileSearchItem(null)}
          item={profileSearchItem}
          onUpdateNegativeInfo={handleUpdateNegativeInfoFromSearch}
        />
      )}
    </div>
  );
};

export default LogbookRejectionPage;
