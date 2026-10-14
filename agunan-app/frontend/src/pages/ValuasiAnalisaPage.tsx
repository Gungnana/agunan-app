import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { pengajuanApi, agunanApi } from '../api/pengajuan';
import { valuasiApi } from '../api/valuasi';
import { Pengajuan, Agunan, Valuasi } from '../types';
import { MapPicker } from '../components/MapPicker';
import { ValuationMap } from '../components/ValuationMap';
import { ResultCard } from '../components/ResultCard';
import { ComparableTable } from '../components/ComparableTable';
import { OverrideModal } from '../components/OverrideModal';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import {
  Calculator,
  Building,
  MapPin,
  Sparkles,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

export const ValuasiAnalisaPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const qPengajuanId = searchParams.get('pengajuanId');
  const qAgunanId = searchParams.get('agunanId');

  const [pengajuanList, setPengajuanList] = useState<Pengajuan[]>([]);
  const [selectedPengajuanId, setSelectedPengajuanId] = useState<number | null>(
    qPengajuanId ? Number(qPengajuanId) : null
  );

  const [agunanList, setAgunanList] = useState<Agunan[]>([]);
  const [selectedAgunan, setSelectedAgunan] = useState<Agunan | null>(null);

  // Form Fields for current Agunan (editable before analysis)
  const [lat, setLat] = useState(-6.2383);
  const [lon, setLon] = useState(106.8528);
  const [luasTanah, setLuasTanah] = useState(250);
  const [legalitas, setLegalitas] = useState<'SHM' | 'HGB' | 'GIRIK' | 'LAINNYA'>('SHM');
  const [lebarJalan, setLebarJalan] = useState(6);
  const [bentukTanah, setBentukTanah] = useState<'PERSEGI' | 'PERSEGI_PANJANG' | 'KANTONG_SEMAR' | 'TIDAK_BERATURAN' | 'L'>('PERSEGI');
  const [alamat, setAlamat] = useState('Jl. Tebet Timur Dalam Raya No. 42');

  // Valuation State
  const [valuasiResult, setValuasiResult] = useState<Valuasi | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Override Modal State
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  // Load Pengajuan List
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const pList = await pengajuanApi.getAll();
        setPengajuanList(pList);

        const targetPId = qPengajuanId ? Number(qPengajuanId) : pList[0]?.id;
        if (targetPId) {
          setSelectedPengajuanId(targetPId);
          loadAgunanForPengajuan(targetPId, qAgunanId ? Number(qAgunanId) : undefined);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchInitial();
  }, []);

  const loadAgunanForPengajuan = async (pId: number, targetAgnId?: number) => {
    try {
      const aList = await agunanApi.getByPengajuanId(pId);
      setAgunanList(aList);

      const targetAgn = targetAgnId
        ? aList.find((a) => a.id === targetAgnId)
        : aList[0];

      if (targetAgn) {
        syncAgunanToForm(targetAgn);
      } else {
        setSelectedAgunan(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const syncAgunanToForm = (agn: Agunan) => {
    setSelectedAgunan(agn);
    setLat(agn.lat);
    setLon(agn.lon);
    setLuasTanah(agn.luas_tanah);
    setLegalitas(agn.legalitas);
    setLebarJalan(agn.lebar_jalan);
    setBentukTanah(agn.bentuk_tanah);
    setAlamat(agn.alamat);
    setValuasiResult(null);
    setAnalysisError(null);
  };

  const handlePengajuanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = Number(e.target.value);
    setSelectedPengajuanId(pId);
    loadAgunanForPengajuan(pId);
  };

  const handleAgunanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const aId = Number(e.target.value);
    const targetAgn = agunanList.find((a) => a.id === aId);
    if (targetAgn) {
      syncAgunanToForm(targetAgn);
    }
  };

  // Run Valuation Pipeline
  const handleRunValuation = async () => {
    if (!selectedAgunan) {
      alert('Pilih agunan terlebih dahulu.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Perbarui data agunan terlebih dahulu jika form diedit analis
      await agunanApi.update(selectedAgunan.id, {
        lat,
        lon,
        luas_tanah: Number(luasTanah),
        legalitas,
        lebar_jalan: Number(lebarJalan),
        bentuk_tanah: bentukTanah,
        alamat,
      });

      // Jalankan pipeline POST /api/v1/valuasi/analisa
      const result = await valuasiApi.analisa(selectedAgunan.id);
      setValuasiResult(result);

      if (result.status === 'DATA_TIDAK_CUKUP') {
        setAnalysisError(
          `Data pembanding pasar di sekitar radius 5 km tidak mencukupi (ditemukan kurang dari 2 pembanding yang valid). Harap tambahkan data survei pasar terlebih dahulu.`
        );
      }
    } catch (err: any) {
      console.error('Error during valuation:', err);
      setAnalysisError(
        err.response?.data?.detail || 'Terjadi kesalahan saat memproses mesin valuasi.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmOverride = async (selectedIds: number[], reason: string) => {
    if (!valuasiResult) return;
    const updated = await valuasiApi.override(valuasiResult.id, selectedIds, reason);
    setValuasiResult(updated);
  };

  // Extract all candidates from snapshot for override selection
  const allCandidates =
    valuasiResult?.snapshot_json?.semua_kandidat_terproses ||
    valuasiResult?.snapshot_json?.kandidat_tersedia ||
    [];

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            Mesin Valuasi Tanah
          </span>
          <span className="text-xs text-slate-400">• Pendekatan Data Pasar (SPI 2026)</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
          Analisa Valuasi Agunan Berbasis Data Pasar
        </h1>
        <p className="text-xs text-slate-500">
          Tentukan titik koordinat agunan di peta, sesuaikan spesifikasi fisik dan legalitas tanah, lalu jalankan model analisa komparasi pasar.
        </p>
      </div>

      <DisclaimerBanner />

      {/* Main Grid: Input Form & MapPicker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Selection & Collateral Parameters */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-900 text-sm flex items-center space-x-2 border-b border-slate-100 pb-3">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Pilih Pengajuan & Agunan Subjek</span>
            </h2>

            {/* Select Pengajuan */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Pengajuan Kredit Debitur
              </label>
              <select
                value={selectedPengajuanId || ''}
                onChange={handlePengajuanChange}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium"
              >
                {pengajuanList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nomor_pengajuan} - {p.nama_debitur} ({p.cif})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Agunan */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Agunan Tanah Terdaftar
              </label>
              <select
                value={selectedAgunan?.id || ''}
                onChange={handleAgunanChange}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium"
              >
                {agunanList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.kode_agunan} - {a.luas_tanah} m² ({a.legalitas}) - {a.kota_kabupaten}
                  </option>
                ))}
              </select>
            </div>

            {/* Parameter Inputs */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                Spesifikasi Fisik & Legalitas Agunan:
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Alamat Lokasi</label>
                <input
                  type="text"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Luas Tanah (m²)</label>
                  <input
                    type="number"
                    min={1}
                    value={luasTanah}
                    onChange={(e) => setLuasTanah(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Lebar Jalan Akses (m)</label>
                  <input
                    type="number"
                    min={1}
                    value={lebarJalan}
                    onChange={(e) => setLebarJalan(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Legalitas Hak</label>
                  <select
                    value={legalitas}
                    onChange={(e: any) => setLegalitas(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white mt-1"
                  >
                    <option value="SHM">SHM (Sertipikat Hak Milik)</option>
                    <option value="HGB">HGB (Hak Guna Bangunan)</option>
                    <option value="GIRIK">GIRIK / AJB / Letter C</option>
                    <option value="LAINNYA">LAINNYA</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Bentuk Tapak</label>
                  <select
                    value={bentukTanah}
                    onChange={(e: any) => setBentukTanah(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white mt-1"
                  >
                    <option value="PERSEGI">PERSEGI (Ideal)</option>
                    <option value="PERSEGI_PANJANG">PERSEGI PANJANG</option>
                    <option value="KANTONG_SEMAR">KANTONG SEMAR</option>
                    <option value="TIDAK_BERATURAN">TIDAK BERATURAN</option>
                    <option value="L">BENTUK L</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Run Button */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleRunValuation}
                disabled={isAnalyzing || !selectedAgunan}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 card-hover"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menjalankan Pipeline Valuasi...</span>
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4" />
                    <span>Jalankan Analisa Valuasi Pasar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Map Picker */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-red-600" />
                <h2 className="font-bold text-slate-900 text-sm">Penentuan Titik Koordinat Agunan (MapPicker)</h2>
              </div>
              <span className="text-[11px] text-slate-400">Peta Interaktif OSM</span>
            </div>

            <MapPicker
              lat={lat}
              lon={lon}
              onChange={(newLat, newLon) => {
                setLat(newLat);
                setLon(newLon);
              }}
              height="380px"
            />
          </div>
        </div>
      </div>

      {/* Analysis Error State Banner */}
      {analysisError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-sm">Analisa Tidak Dapat Diselesaikan:</span>
            <p className="leading-relaxed">{analysisError}</p>
          </div>
        </div>
      )}

      {/* Valuation Output Section (Appears after analysis) */}
      {valuasiResult && valuasiResult.status !== 'DATA_TIDAK_CUKUP' && selectedAgunan && (
        <div className="space-y-6 pt-4 border-t border-slate-200">
          {/* 1. Result Summary Card */}
          <ResultCard
            valuasi={valuasiResult}
            agunan={{
              ...selectedAgunan,
              lat,
              lon,
              luas_tanah: luasTanah,
              legalitas,
              lebar_jalan: lebarJalan,
              bentuk_tanah: bentukTanah,
              alamat,
            }}
          />

          {/* 2. Interactive Valuation Map */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-base">Peta Sebaran Pembanding & Radius Efektif</h2>
              <span className="text-xs text-slate-500">
                Radius pencarian: <b>{valuasiResult.radius_efektif_meter} m</b>
              </span>
            </div>
            <ValuationMap
              agunan={{
                ...selectedAgunan,
                lat,
                lon,
                luas_tanah: luasTanah,
                legalitas,
                lebar_jalan: lebarJalan,
                bentuk_tanah: bentukTanah,
                alamat,
              }}
              selectedComparables={valuasiResult.selected_pembanding || []}
              allCandidates={allCandidates}
              effectiveRadiusMeters={valuasiResult.radius_efektif_meter || 1000}
              height="500px"
            />
          </div>

          {/* 3. Comparable Table with 6 Factors & Override Trigger */}
          <div className="space-y-2">
            <ComparableTable
              comparables={valuasiResult.selected_pembanding || []}
              onOpenOverrideModal={() => setIsOverrideModalOpen(true)}
              canOverride={true}
            />
          </div>

          {/* Override Modal */}
          <OverrideModal
            isOpen={isOverrideModalOpen}
            onClose={() => setIsOverrideModalOpen(false)}
            currentSelected={valuasiResult.selected_pembanding || []}
            allCandidates={allCandidates}
            onConfirmOverride={handleConfirmOverride}
          />
        </div>
      )}
    </div>
  );
};
