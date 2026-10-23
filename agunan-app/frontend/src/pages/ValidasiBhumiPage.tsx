import React, { useState, useEffect, useMemo } from 'react';
import {
  ExternalLink,
  Search,
  Plus,
  Compass,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck2,
  MapPin,
  Layers,
  Copy,
  Check,
  ShieldCheck,
  Building,
  User,
  Info,
  Printer,
  Edit2,
  Trash2,
  RotateCcw,
  Eye,
  X,
  Maximize2,
  Globe2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  BhumiVerificationItem,
  SEED_BHUMI_VERIFICATIONS,
} from '../types/bhumi';
import { useAuth } from '../hooks/useAuth';

const LOCAL_STORAGE_KEY = 'agunan_bhumi_verifications_v1';
const BHUMI_PETA_URL = 'https://bhumi.atrbpn.go.id/peta';

const formatRupiah = (val?: number | null): string => {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
};

export const ValidasiBhumiPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<BhumiVerificationItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterRekomendasi, setFilterRekomendasi] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Quick Coordinate Jump state
  const [quickLat, setQuickLat] = useState<string>('-8.6183');
  const [quickLon, setQuickLon] = useState<string>('115.2215');
  const [quickLocationName, setQuickLocationName] = useState<string>('Peguyangan Kangin, Denpasar');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<BhumiVerificationItem | null>(null);
  const [detailItem, setDetailItem] = useState<BhumiVerificationItem | null>(null);

  // Form State
  interface BhumiFormData {
    nama_nasabah: string;
    no_permohonan: string;
    alamat_agunan: string;
    latitude: number;
    longitude: number;
    jenis_sertifikat: BhumiVerificationItem['jenis_sertifikat'];
    no_sertifikat: string;
    nib_bpn: string;
    luas_sertifikat_m2: number;
    luas_peta_bpn_m2: number;
    status_bidang: BhumiVerificationItem['status_bidang'];
    zona_nilai_tanah_m2: number;
    catatan_blokir: string;
    rekomendasi: BhumiVerificationItem['rekomendasi'];
    analis: string;
  }

  const initialForm: BhumiFormData = {
    nama_nasabah: '',
    no_permohonan: '',
    alamat_agunan: '',
    latitude: -8.6183,
    longitude: 115.2215,
    jenis_sertifikat: 'SHM',
    no_sertifikat: '',
    nib_bpn: '',
    luas_sertifikat_m2: 300,
    luas_peta_bpn_m2: 300,
    status_bidang: 'TERDAFTAR_LENGKAP',
    zona_nilai_tanah_m2: 4000000,
    catatan_blokir: '',
    rekomendasi: 'VALID_CLEAR',
    analis: user?.full_name || 'I Putu Dimas Adiputra',
  };
  const [formData, setFormData] = useState<BhumiFormData>(initialForm);

  // Load from localStorage or seed
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          return;
        }
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_BHUMI_VERIFICATIONS));
      setItems(SEED_BHUMI_VERIFICATIONS);
    } catch {
      setItems(SEED_BHUMI_VERIFICATIONS);
    }
  }, []);

  const saveToStorage = (updated: BhumiVerificationItem[]) => {
    setItems(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Open Isolated Sandbox Window
  const handleOpenBhumiSandbox = (lat?: number, lon?: number) => {
    const width = 1280;
    const height = 820;
    const left = Math.max(0, (window.screen.width - width) / 2);
    const top = Math.max(0, (window.screen.height - height) / 2);

    const targetUrl = BHUMI_PETA_URL;
    const windowFeatures = `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=yes,resizable=yes,status=no`;

    const newWin = window.open(targetUrl, 'bhumi_atrbpn_sandbox', windowFeatures);
    if (!newWin) {
      alert('Pop-up browser diblokir. Harap izinkan pop-up untuk membuka browser terisolasi Bhumi ATR/BPN.');
      return;
    }

    if (lat && lon) {
      showToast(`Membuka Bhumi ATR/BPN. Koordinat ${lat}, ${lon} siap dicari pada peta.`);
    } else {
      showToast('Browser Terisolasi Bhumi ATR/BPN berhasil dibuka.');
    }
  };

  const handleCopyBhumiUrl = () => {
    navigator.clipboard.writeText(BHUMI_PETA_URL);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Preset location select
  const handleSelectPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'peguyangan') {
      setQuickLat('-8.6183');
      setQuickLon('115.2215');
      setQuickLocationName('Peguyangan Kangin, Denpasar');
    } else if (val === 'sanur') {
      setQuickLat('-8.7052');
      setQuickLon('115.2471');
      setQuickLocationName('Sanur Kauh, Denpasar Selatan');
    } else if (val === 'kuta') {
      setQuickLat('-8.7231');
      setQuickLon('115.1764');
      setQuickLocationName('Kuta, Badung');
    } else if (val === 'canggu') {
      setQuickLat('-8.6478');
      setQuickLon('115.1385');
      setQuickLocationName('Canggu, Kuta Utara, Badung');
    } else if (val === 'ubud') {
      setQuickLat('-8.5069');
      setQuickLon('115.2625');
      setQuickLocationName('Ubud, Gianyar');
    }
  };

  // Form Open / Edit
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      ...initialForm,
      analis: user?.full_name || 'I Putu Dimas Adiputra',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: BhumiVerificationItem) => {
    setEditingItem(item);
    setFormData({
      nama_nasabah: item.nama_nasabah,
      no_permohonan: item.no_permohonan || '',
      alamat_agunan: item.alamat_agunan,
      latitude: item.latitude || -8.6183,
      longitude: item.longitude || 115.2215,
      jenis_sertifikat: item.jenis_sertifikat,
      no_sertifikat: item.no_sertifikat,
      nib_bpn: item.nib_bpn,
      luas_sertifikat_m2: item.luas_sertifikat_m2,
      luas_peta_bpn_m2: item.luas_peta_bpn_m2,
      status_bidang: item.status_bidang,
      zona_nilai_tanah_m2: item.zona_nilai_tanah_m2 || 0,
      catatan_blokir: item.catatan_blokir || '',
      rekomendasi: item.rekomendasi,
      analis: item.analis,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (item: BhumiVerificationItem) => {
    if (window.confirm(`Hapus catatan validasi bidang tanah ${item.no_sertifikat} an. ${item.nama_nasabah}?`)) {
      const updated = items.filter((i) => i.id !== item.id);
      saveToStorage(updated);
      showToast('Catatan validasi berhasil dihapus.');
    }
  };

  const handleResetSeed = () => {
    if (window.confirm('Kembalikan data validasi bidang ke data awal (3 sampel agunan Bali)?')) {
      saveToStorage(SEED_BHUMI_VERIFICATIONS);
      showToast('Data dikembalikan ke sampel resmi.');
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_nasabah || !formData.no_sertifikat) {
      alert('Nama nasabah dan Nomor Sertifikat wajib diisi.');
      return;
    }

    const luasSert = Number(formData.luas_sertifikat_m2) || 0;
    const luasPeta = Number(formData.luas_peta_bpn_m2) || 0;
    const selisihLuas = luasPeta - luasSert;
    const selisihPersen = luasSert > 0 ? (selisihLuas / luasSert) * 100 : 0;

    if (editingItem) {
      const updated = items.map((i) => {
        if (i.id === editingItem.id) {
          return {
            ...i,
            ...formData,
            selisih_luas_m2: selisihLuas,
            selisih_persen: Number(selisihPersen.toFixed(2)),
          };
        }
        return i;
      });
      saveToStorage(updated);
      showToast('Catatan validasi bidang tanah berhasil diperbarui.');
    } else {
      const newItem: BhumiVerificationItem = {
        id: `bhumi-${Date.now()}`,
        ...formData,
        selisih_luas_m2: selisihLuas,
        selisih_persen: Number(selisihPersen.toFixed(2)),
        tanggal_verifikasi: new Date().toLocaleDateString('id-ID'),
        created_at: new Date().toISOString(),
      };
      saveToStorage([newItem, ...items]);
      showToast('Catatan validasi bidang tanah baru berhasil ditambahkan.');
    }

    setIsFormOpen(false);
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        item.nama_nasabah.toLowerCase().includes(term) ||
        item.no_sertifikat.toLowerCase().includes(term) ||
        item.nib_bpn.toLowerCase().includes(term) ||
        item.alamat_agunan.toLowerCase().includes(term) ||
        (item.no_permohonan && item.no_permohonan.toLowerCase().includes(term));

      const matchRekomendasi =
        filterRekomendasi === 'ALL' || item.rekomendasi === filterRekomendasi;

      return matchSearch && matchRekomendasi;
    });
  }, [items, searchTerm, filterRekomendasi]);

  // Statistics
  const stats = useMemo(() => {
    const total = items.length;
    const valid = items.filter((i) => i.rekomendasi === 'VALID_CLEAR').length;
    const klarifikasi = items.filter((i) => i.rekomendasi === 'PERLU_KLARIFIKASI').length;
    const bermasalah = items.filter((i) => i.rekomendasi === 'BERMASALAH_TOLAK').length;
    return { total, valid, klarifikasi, bermasalah };
  }, [items]);

  const getRekomendasiBadge = (rek: string) => {
    switch (rek) {
      case 'VALID_CLEAR':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>VALID / CLEAR</span>
          </span>
        );
      case 'PERLU_KLARIFIKASI':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>PERLU KLARIFIKASI</span>
          </span>
        );
      case 'BERMASALAH_TOLAK':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            <span>BERMASALAH / TOLAK</span>
          </span>
        );
    }
  };

  const getStatusBidangBadge = (status: string) => {
    switch (status) {
      case 'TERDAFTAR_LENGKAP':
        return <span className="text-emerald-700 font-semibold">Terdaftar & Terpetakan</span>;
      case 'BELUM_TERPETAKAN':
        return <span className="text-amber-700 font-semibold">Belum Terpetakan (Floating)</span>;
      case 'TUMPANG_TINDIH':
        return <span className="text-rose-700 font-semibold">Tumpang Tindih Batas</span>;
      case 'SENGKETA':
      default:
        return <span className="text-rose-800 font-semibold">Tercatat Sengketa BPN</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-3 text-xs sm:text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>KEMENTERIAN ATR/BPN REPUBLIK INDONESIA</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Validasi Peta Bidang Tanah Bhumi ATR/BPN
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Portal kerja terintegrasi untuk analis kredit dalam memvalidasi Nomor Identifikasi Bidang (NIB), Zona Nilai Tanah (ZNT), bentuk fisik persil, dan indikasi sengketa/tumpang tindih sertifikat agunan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleOpenBhumiSandbox()}
              className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-xl shadow-blue-600/30 transition-all flex items-center space-x-2 border border-blue-400/30"
            >
              <Compass className="w-4 h-4 text-blue-200" />
              <span>Buka Browser Terisolasi Bhumi BPN</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg transition-all flex items-center space-x-2 border border-slate-700"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Input Validasi Agunan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sandbox Controller & Quick Coordinate Jump Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Globe2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>Kontrol Browser Terisolasi (Isolated Sandbox Window)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  Aktif & Siap
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Membuka tampilan resmi WebGIS Bhumi BPN tanpa batasan iframe / CSP server, dengan jendela browser terisolasi.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 flex items-center space-x-2">
              <span className="truncate max-w-xs">{BHUMI_PETA_URL}</span>
              <button
                onClick={handleCopyBhumiUrl}
                title="Salin Tautan"
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Coordinate Jump Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
          <div className="md:col-span-3">
            <label className="block text-slate-500 font-semibold mb-1">Preset Lokasi Agunan Bali:</label>
            <select
              onChange={handleSelectPreset}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="peguyangan">Peguyangan Kangin (Denpasar Utara)</option>
              <option value="sanur">Sanur Kauh (Denpasar Selatan)</option>
              <option value="kuta">Kuta (Badung)</option>
              <option value="canggu">Canggu (Kuta Utara)</option>
              <option value="ubud">Ubud (Gianyar)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-500 font-semibold mb-1">Latitude:</label>
            <input
              type="text"
              value={quickLat}
              onChange={(e) => setQuickLat(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-500 font-semibold mb-1">Longitude:</label>
            <input
              type="text"
              value={quickLon}
              onChange={(e) => setQuickLon(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-5 flex items-end space-x-2 pt-4 md:pt-0">
            <button
              onClick={() => handleOpenBhumiSandbox(Number(quickLat), Number(quickLon))}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-blue-600/20"
            >
              <Compass className="w-4 h-4" />
              <span>Buka Koordinat di Bhumi</span>
            </button>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${quickLat},${quickLon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center space-x-1.5 transition-all"
            >
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>Google Satelit</span>
            </a>
          </div>
        </div>

        <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-[11px] text-blue-900 flex items-start space-x-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Petunjuk Analis:</strong> Jendela browser terisolasi akan memuat peta resmi BPN. Anda dapat mengaktifkan layer <em>&quot;Batas Bidang Tanah&quot;</em> dan <em>&quot;Zona Nilai Tanah&quot;</em> pada panel layer di pojok kanan atas Bhumi BPN untuk memeriksa status bidang tanah agunan.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Agunan Divalidasi</span>
            <FileCheck2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          <p className="text-[11px] text-slate-500 mt-1">Sertifikat terdaftar di sistem</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Status Valid / Clear</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{stats.valid}</div>
          <p className="text-[11px] text-emerald-600 mt-1">Batas & NIB cocok 100%</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Perlu Klarifikasi</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700">{stats.klarifikasi}</div>
          <p className="text-[11px] text-amber-600 mt-1">Floating / selisih luas ukur</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Bermasalah / Sengketa</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700">{stats.bermasalah}</div>
          <p className="text-[11px] text-rose-600 mt-1">Tumpang tindih / blokir BPN</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama nasabah, nomor sertifikat, NIB, atau alamat..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filterRekomendasi}
              onChange={(e) => setFilterRekomendasi(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Rekomendasi</option>
              <option value="VALID_CLEAR">Valid / Clear</option>
              <option value="PERLU_KLARIFIKASI">Perlu Klarifikasi</option>
              <option value="BERMASALAH_TOLAK">Bermasalah / Tolak</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Records */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">
              Riwayat Validasi Sertifikat & Peta Bhumi BPN
            </h3>
            <span className="text-xs text-slate-400">({filteredItems.length} berkas)</span>
          </div>

          <button
            onClick={handleResetSeed}
            className="text-xs text-slate-400 hover:text-slate-700 flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sampel</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-3 w-10 text-center">NO</th>
                <th className="py-3 px-3">NASABAH & PERMOHONAN</th>
                <th className="py-3 px-3">LEGALITAS / SERTIFIKAT</th>
                <th className="py-3 px-3">NIB BHUMI BPN</th>
                <th className="py-3 px-3 text-right">LUAS SERTIFIKAT</th>
                <th className="py-3 px-3 text-right">LUAS PETA BPN</th>
                <th className="py-3 px-3 text-center">SELISIH LUAS</th>
                <th className="py-3 px-3 text-right">ZNT BPN (M²)</th>
                <th className="py-3 px-3 text-center">STATUS BIDANG</th>
                <th className="py-3 px-3 text-center">REKOMENDASI</th>
                <th className="py-3 px-3 text-center w-24">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    Tidak ada catatan validasi bidang tanah yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-slate-400">{index + 1}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{item.nama_nasabah}</div>
                      <div className="text-[11px] text-slate-500">{item.no_permohonan || '-'}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{item.alamat_agunan}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] mr-1">
                        {item.jenis_sertifikat}
                      </span>
                      <span className="font-semibold">{item.no_sertifikat}</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                      {item.nib_bpn || '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-medium">{item.luas_sertifikat_m2} m²</td>
                    <td className="py-3 px-3 text-right font-medium">{item.luas_peta_bpn_m2} m²</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-bold ${
                          item.selisih_luas_m2 === 0
                            ? 'text-emerald-700'
                            : item.selisih_luas_m2 > 0
                            ? 'text-blue-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {item.selisih_luas_m2 > 0 ? `+${item.selisih_luas_m2}` : item.selisih_luas_m2} m²
                        <span className="text-[10px] block text-slate-400">
                          ({item.selisih_persen > 0 ? `+${item.selisih_persen}` : item.selisih_persen}%)
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium">
                      {formatRupiah(item.zona_nilai_tanah_m2)}
                    </td>
                    <td className="py-3 px-3 text-center">{getStatusBidangBadge(item.status_bidang)}</td>
                    <td className="py-3 px-3 text-center">{getRekomendasiBadge(item.rekomendasi)}</td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleOpenBhumiSandbox(item.latitude, item.longitude)}
                          title="Buka Koordinat Agunan di Bhumi BPN"
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Compass className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                        <button
                          onClick={() => setDetailItem(item)}
                          title="Lihat Lembar Validasi"
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Catatan"
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Input / Edit Validasi */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full my-8 overflow-hidden animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">
                    {editingItem ? 'Edit Lembar Validasi Bidang BPN' : 'Input Validasi Bidang Tanah (Bhumi BPN)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Catat hasil pengecekan NIB, luas ukur peta, dan indikasi sengketa batas
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

            <form onSubmit={handleSaveForm} className="p-6 space-y-4 text-xs sm:text-sm max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nama Nasabah / Debitur *</label>
                  <input
                    type="text"
                    required
                    value={formData.nama_nasabah}
                    onChange={(e) => setFormData({ ...formData, nama_nasabah: e.target.value })}
                    placeholder="Contoh: I WAYAN SUDIRTA"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nomor Permohonan Kredit</label>
                  <input
                    type="text"
                    value={formData.no_permohonan}
                    onChange={(e) => setFormData({ ...formData, no_permohonan: e.target.value })}
                    placeholder="Contoh: 088/BPRK/2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Alamat / Lokasi Agunan</label>
                <input
                  type="text"
                  value={formData.alamat_agunan}
                  onChange={(e) => setFormData({ ...formData, alamat_agunan: e.target.value })}
                  placeholder="Contoh: Jl. Ahmad Yani Utara, Peguyangan Kangin, Denpasar"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Jenis Sertifikat</label>
                  <select
                    value={formData.jenis_sertifikat}
                    onChange={(e) => setFormData({ ...formData, jenis_sertifikat: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SHM">SHM (Hak Milik)</option>
                    <option value="SHGB">SHGB (Hak Guna Bangunan)</option>
                    <option value="HAK_PAKAI">Hak Pakai</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nomor Sertifikat *</label>
                  <input
                    type="text"
                    required
                    value={formData.no_sertifikat}
                    onChange={(e) => setFormData({ ...formData, no_sertifikat: e.target.value })}
                    placeholder="Contoh: SHM No. 1243/Peguyangan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">NIB dari Bhumi BPN</label>
                  <input
                    type="text"
                    value={formData.nib_bpn}
                    onChange={(e) => setFormData({ ...formData, nib_bpn: e.target.value })}
                    placeholder="Contoh: 22.01.04.02.01243"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Luas Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Luas di Sertifikat (m²)</label>
                  <input
                    type="number"
                    value={formData.luas_sertifikat_m2}
                    onChange={(e) => setFormData({ ...formData, luas_sertifikat_m2: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Luas Ukur Peta Bhumi (m²)</label>
                  <input
                    type="number"
                    value={formData.luas_peta_bpn_m2}
                    onChange={(e) => setFormData({ ...formData, luas_peta_bpn_m2: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Selisih Fisik Spasial</label>
                  <div className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-800">
                    {formData.luas_peta_bpn_m2 - formData.luas_sertifikat_m2} m²{' '}
                    <span className="text-xs text-slate-400">
                      (
                      {formData.luas_sertifikat_m2 > 0
                        ? (
                            ((formData.luas_peta_bpn_m2 - formData.luas_sertifikat_m2) /
                              formData.luas_sertifikat_m2) *
                            100
                          ).toFixed(1)
                        : 0}
                      %)
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Bidang & ZNT & Rekomendasi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status Bidang BPN</label>
                  <select
                    value={formData.status_bidang}
                    onChange={(e) => setFormData({ ...formData, status_bidang: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TERDAFTAR_LENGKAP">Terdaftar & Terpetakan</option>
                    <option value="BELUM_TERPETAKAN">Belum Terpetakan (Floating)</option>
                    <option value="TUMPANG_TINDIH">Tumpang Tindih Batas</option>
                    <option value="SENGKETA">Tercatat Sengketa BPN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Zona Nilai Tanah BPN (Rp/m²)</label>
                  <input
                    type="number"
                    value={formData.zona_nilai_tanah_m2}
                    onChange={(e) => setFormData({ ...formData, zona_nilai_tanah_m2: Number(e.target.value) })}
                    placeholder="Contoh: 4500000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Rekomendasi Analis</label>
                  <select
                    value={formData.rekomendasi}
                    onChange={(e) => setFormData({ ...formData, rekomendasi: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="VALID_CLEAR">VALID / CLEAR & CLEAN</option>
                    <option value="PERLU_KLARIFIKASI">PERLU KLARIFIKASI KANTOR PERTANAHAN</option>
                    <option value="BERMASALAH_TOLAK">BERMASALAH / REKOMENDASI TOLAK</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Catatan Blokir / Masalah Batas / Temuan Fisik BPN
                </label>
                <textarea
                  rows={3}
                  value={formData.catatan_blokir}
                  onChange={(e) => setFormData({ ...formData, catatan_blokir: e.target.value })}
                  placeholder="Catatan hasil verifikasi batas, kesesuaian tembok pembatas, nomor surat ukur, atau catatan blokir peradilan..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/30"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Tambahkan Validasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail / Lembar Verifikasi BPN */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">Lembar Validasi Bidang Tanah (BPN)</h3>
                  <p className="text-xs text-slate-400">Verifikasi Resmi Sistem Peta Bhumi ATR/BPN</p>
                </div>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dossier Body */}
            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Nama Pemohon / Nasabah
                  </span>
                  <div className="text-base font-black text-slate-900">{detailItem.nama_nasabah}</div>
                  <div className="text-xs text-slate-500">{detailItem.no_permohonan || '-'}</div>
                </div>
                <div>{getRekomendasiBadge(detailItem.rekomendasi)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400">Legalitas Sertifikat:</span>
                  <div className="font-bold text-slate-800">{detailItem.no_sertifikat}</div>
                  <span className="text-[11px] text-blue-600 font-semibold">{detailItem.jenis_sertifikat}</span>
                </div>

                <div>
                  <span className="text-slate-400">NIB (Bhumi BPN):</span>
                  <div className="font-mono font-bold text-slate-800">{detailItem.nib_bpn || '-'}</div>
                  <div className="text-[11px] text-slate-500">{getStatusBidangBadge(detailItem.status_bidang)}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 text-center">
                <div>
                  <span className="text-[10px] text-slate-500">Luas di Sertifikat</span>
                  <div className="font-bold text-slate-800 mt-0.5">{detailItem.luas_sertifikat_m2} m²</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Luas Peta BPN</span>
                  <div className="font-bold text-slate-800 mt-0.5">{detailItem.luas_peta_bpn_m2} m²</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Selisih Spasial</span>
                  <div
                    className={`font-bold mt-0.5 ${
                      detailItem.selisih_luas_m2 === 0
                        ? 'text-emerald-700'
                        : detailItem.selisih_luas_m2 > 0
                        ? 'text-blue-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {detailItem.selisih_luas_m2 > 0 ? `+${detailItem.selisih_luas_m2}` : detailItem.selisih_luas_m2} m²
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400">Zona Nilai Tanah (ZNT):</span>
                  <div className="font-bold text-slate-800">{formatRupiah(detailItem.zona_nilai_tanah_m2)} / m²</div>
                </div>
                <div>
                  <span className="text-slate-400">Tanggal & Analis:</span>
                  <div className="font-bold text-slate-800">{detailItem.tanggal_verifikasi}</div>
                  <div className="text-xs text-slate-500">{detailItem.analis}</div>
                </div>
              </div>

              {detailItem.catatan_blokir && (
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold">Catatan Temuan / Blokir BPN:</span>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs leading-relaxed">
                    {detailItem.catatan_blokir}
                  </div>
                </div>
              )}

              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenBhumiSandbox(detailItem.latitude, detailItem.longitude)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center space-x-2 shadow-lg shadow-blue-600/20"
                >
                  <Compass className="w-4 h-4" />
                  <span>Buka di Peta Bhumi BPN</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailItem(null)}
                  className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidasiBhumiPage;
