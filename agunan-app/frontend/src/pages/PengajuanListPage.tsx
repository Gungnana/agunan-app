import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pengajuanApi, agunanApi } from '../api/pengajuan';
import { Pengajuan, Agunan } from '../types';
import { MapPicker } from '../components/MapPicker';
import {
  Plus,
  FileSpreadsheet,
  Building,
  Calculator,
  Search,
  ExternalLink,
  X,
  MapPin,
} from 'lucide-react';

export const PengajuanListPage: React.FC = () => {
  const [pengajuanList, setPengajuanList] = useState<Pengajuan[]>([]);
  const [selectedPengajuan, setSelectedPengajuan] = useState<Pengajuan | null>(null);
  const [agunanList, setAgunanList] = useState<Agunan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isAddPengajuanOpen, setIsAddPengajuanOpen] = useState(false);
  const [isAddAgunanOpen, setIsAddAgunanOpen] = useState(false);

  // New Pengajuan Form State
  const [newNoPengajuan, setNewNoPengajuan] = useState(`PJ-2026-${Math.floor(10000 + Math.random() * 90000)}`);
  const [newDebitur, setNewDebitur] = useState('');
  const [newCif, setNewCif] = useState(`CIF-${Math.floor(1000000 + Math.random() * 9000000)}`);
  const [newPlafon, setNewPlafon] = useState(2000000000);
  const [newJenisKredit, setNewJenisKredit] = useState('Kredit Modal Kerja');

  // New Agunan Form State
  const [newKodeAgunan, setNewKodeAgunan] = useState(`AGN-JKT-${Math.floor(100 + Math.random() * 900)}`);
  const [newLat, setNewLat] = useState(-6.2383);
  const [newLon, setNewLon] = useState(106.8528);
  const [newAlamat, setNewAlamat] = useState('Jl. Tebet Timur Dalam Raya No. 45');
  const [newKota, setNewKota] = useState('Jakarta Selatan');
  const [newProvinsi, setNewProvinsi] = useState('DKI Jakarta');
  const [newLuas, setNewLuas] = useState(250);
  const [newLegalitas, setNewLegalitas] = useState<'SHM' | 'HGB' | 'GIRIK' | 'LAINNYA'>('SHM');
  const [newLebarJalan, setNewLebarJalan] = useState(6);
  const [newBentuk, setNewBentuk] = useState<'PERSEGI' | 'PERSEGI_PANJANG' | 'KANTONG_SEMAR' | 'TIDAK_BERATURAN' | 'L'>('PERSEGI');

  const fetchPengajuan = async () => {
    try {
      setIsLoading(true);
      const data = await pengajuanApi.getAll();
      setPengajuanList(data);
      if (data.length > 0 && !selectedPengajuan) {
        setSelectedPengajuan(data[0]);
        loadAgunan(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPengajuan();
  }, []);

  const loadAgunan = async (pengajuanId: number) => {
    try {
      const data = await agunanApi.getByPengajuanId(pengajuanId);
      setAgunanList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectPengajuan = (p: Pengajuan) => {
    setSelectedPengajuan(p);
    loadAgunan(p.id);
  };

  const handleCreatePengajuan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await pengajuanApi.create({
        nomor_pengajuan: newNoPengajuan,
        nama_debitur: newDebitur,
        cif: newCif,
        plafon_diajukan: Number(newPlafon),
        jenis_kredit: newJenisKredit,
      });
      setIsAddPengajuanOpen(false);
      setNewDebitur('');
      await fetchPengajuan();
      setSelectedPengajuan(created);
      loadAgunan(created.id);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Gagal menyimpan pengajuan.');
    }
  };

  const handleCreateAgunan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPengajuan) return;
    try {
      await agunanApi.create({
        pengajuan_id: selectedPengajuan.id,
        kode_agunan: newKodeAgunan,
        jenis_properti: 'TANAH',
        lat: newLat,
        lon: newLon,
        alamat: newAlamat,
        kota_kabupaten: newKota,
        provinsi: newProvinsi,
        luas_tanah: Number(newLuas),
        legalitas: newLegalitas,
        lebar_jalan: Number(newLebarJalan),
        bentuk_tanah: newBentuk,
      });
      setIsAddAgunanOpen(false);
      loadAgunan(selectedPengajuan.id);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Gagal mendaftarkan agunan.');
    }
  };

  const filteredPengajuan = pengajuanList.filter(
    (p) =>
      p.nama_debitur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nomor_pengajuan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cif.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Pengajuan Kredit & Agunan
          </h1>
          <p className="text-xs text-slate-500">
            Daftar pengajuan fasilitas kredit debitur dan registrasi agunan tanah pendukung.
          </p>
        </div>

        <button
          onClick={() => {
            setNewNoPengajuan(`PJ-2026-${Math.floor(10000 + Math.random() * 90000)}`);
            setIsAddPengajuanOpen(true);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition card-hover"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengajuan Kredit</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pengajuan List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari debitur, nomor, atau CIF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {filteredPengajuan.map((p) => {
                const isSelected = selectedPengajuan?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPengajuan(p)}
                    className={`p-4 cursor-pointer transition text-xs space-y-1 ${
                      isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{p.nama_debitur}</span>
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {p.nomor_pengajuan}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] flex justify-between">
                      <span>CIF: {p.cif}</span>
                      <span>{p.jenis_kredit}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 font-medium">
                      <span className="font-mono font-bold text-blue-700">{formatRupiah(p.plafon_diajukan)}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                        {p.status}
                      </span>
                    </div>
                  </div>
                );
              })}
              {filteredPengajuan.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">Tidak ada pengajuan ditemukan.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Pengajuan Detail & Agunan List */}
        <div className="lg:col-span-7 space-y-4">
          {selectedPengajuan ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              {/* Debtor Profile Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Detail Pengajuan Terpilih
                  </span>
                  <h2 className="text-lg font-black text-slate-900">{selectedPengajuan.nama_debitur}</h2>
                  <div className="text-xs text-slate-500 mt-0.5">
                    No: <b className="font-mono text-slate-700">{selectedPengajuan.nomor_pengajuan}</b> • CIF: {selectedPengajuan.cif}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setNewKodeAgunan(`AGN-${selectedPengajuan.nomor_pengajuan.split('-')[2] || '001'}`);
                    setIsAddAgunanOpen(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Daftarkan Agunan Baru</span>
                </button>
              </div>

              {/* Agunan Cards List */}
              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Agunan Terdaftar ({agunanList.length})
                </h3>

                {agunanList.map((agn) => (
                  <div
                    key={agn.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                          <Building className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-xs font-mono">{agn.kode_agunan}</span>
                          <div className="text-[11px] text-slate-500">{agn.jenis_properti} ({agn.legalitas})</div>
                        </div>
                      </div>

                      <Link
                        to={`/valuasi?pengajuanId=${selectedPengajuan.id}&agunanId=${agn.id}`}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm transition"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>Analisa Valuasi</span>
                      </Link>
                    </div>

                    <div className="text-xs text-slate-600 leading-relaxed">
                      {agn.alamat}, {agn.kota_kabupaten}, {agn.provinsi}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                      <div>
                        <span className="text-slate-400">Luas Tanah:</span>
                        <div className="font-bold text-slate-800">{agn.luas_tanah} m²</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Lebar Jalan:</span>
                        <div className="font-bold text-slate-800">{agn.lebar_jalan} meter</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Bentuk:</span>
                        <div className="font-bold text-slate-800">{agn.bentuk_tanah}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Koordinat:</span>
                        <div className="font-mono text-slate-700 font-semibold">{agn.lat.toFixed(4)}, {agn.lon.toFixed(4)}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {agunanList.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Belum ada agunan terdaftar untuk pengajuan ini. Klik "Daftarkan Agunan Baru" untuk menambahkan.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Pilih salah satu pengajuan di sisi kiri untuk melihat data agunan.
            </div>
          )}
        </div>
      </div>

      {/* Modal Add Pengajuan */}
      {isAddPengajuanOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Registrasi Pengajuan Kredit Baru</h3>
              <button onClick={() => setIsAddPengajuanOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePengajuan} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase">Nomor Pengajuan</label>
                <input
                  type="text"
                  required
                  value={newNoPengajuan}
                  onChange={(e) => setNewNoPengajuan(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 uppercase">Nama Debitur</label>
                <input
                  type="text"
                  required
                  placeholder="PT / CV / Perorangan"
                  value={newDebitur}
                  onChange={(e) => setNewDebitur(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">CIF Debitur</label>
                  <input
                    type="text"
                    required
                    value={newCif}
                    onChange={(e) => setNewCif(e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Plafon Diajukan (Rp)</label>
                  <input
                    type="number"
                    required
                    value={newPlafon}
                    onChange={(e) => setNewPlafon(Number(e.target.value))}
                    className="w-full mt-1 p-2.5 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 uppercase">Jenis Fasilitas Kredit</label>
                <select
                  value={newJenisKredit}
                  onChange={(e) => setNewJenisKredit(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="Kredit Modal Kerja">Kredit Modal Kerja</option>
                  <option value="Kredit Investasi">Kredit Investasi</option>
                  <option value="KPR / Pemilikan Properti">KPR / Pemilikan Properti</option>
                  <option value="Kredit Komersial Sindikasi">Kredit Komersial Sindikasi</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddPengajuanOpen(false)}
                  className="px-4 py-2 text-slate-600 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700"
                >
                  Simpan Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Agunan */}
      {isAddAgunanOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Registrasi Agunan Tanah Baru</h3>
              <button onClick={() => setIsAddAgunanOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAgunan} className="p-6 space-y-4 text-xs">
              <div>
                <MapPicker lat={newLat} lon={newLon} onChange={(lat, lon) => { setNewLat(lat); setNewLon(lon); }} height="260px" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Kode Agunan</label>
                  <input
                    type="text"
                    required
                    value={newKodeAgunan}
                    onChange={(e) => setNewKodeAgunan(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Luas Tanah (m²)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newLuas}
                    onChange={(e) => setNewLuas(Number(e.target.value))}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Alamat Lengkap</label>
                <input
                  type="text"
                  required
                  value={newAlamat}
                  onChange={(e) => setNewAlamat(e.target.value)}
                  className="w-full mt-1 p-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Kota / Kabupaten</label>
                  <input
                    type="text"
                    required
                    value={newKota}
                    onChange={(e) => setNewKota(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Provinsi</label>
                  <input
                    type="text"
                    required
                    value={newProvinsi}
                    onChange={(e) => setNewProvinsi(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Legalitas Hak</label>
                  <select
                    value={newLegalitas}
                    onChange={(e: any) => setNewLegalitas(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="SHM">SHM (Sertipikat Hak Milik)</option>
                    <option value="HGB">HGB (Hak Guna Bangunan)</option>
                    <option value="GIRIK">GIRIK / AJB / Letter C</option>
                    <option value="LAINNYA">LAINNYA</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Lebar Jalan (meter)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newLebarJalan}
                    onChange={(e) => setNewLebarJalan(Number(e.target.value))}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Bentuk Tapak Tanah</label>
                  <select
                    value={newBentuk}
                    onChange={(e: any) => setNewBentuk(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="PERSEGI">PERSEGI (Ideal)</option>
                    <option value="PERSEGI_PANJANG">PERSEGI PANJANG</option>
                    <option value="KANTONG_SEMAR">KANTONG SEMAR (Premium)</option>
                    <option value="TIDAK_BERATURAN">TIDAK BERATURAN</option>
                    <option value="L">BENTUK L</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddAgunanOpen(false)}
                  className="px-4 py-2 text-slate-600 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold shadow-md hover:bg-emerald-700"
                >
                  Simpan Agunan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
