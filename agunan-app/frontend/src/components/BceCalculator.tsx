import React, { useState, useMemo } from 'react';

export interface EvaluatedComparableItem {
  referenceTitle: string;
  url: string;
  address: string;
  propertyType: string;
  sourceName: string;
  distanceMeters: number | null;
  discountFactor: number | null;
  areaM2: number | null;
  offerPrice: number | null;
  discountedOfferPrice: number | null;
  discountedPricePerM2: number | null;
  adjustedPricePerAre: number | null;
}

export interface BceCalculatorProps {
  averagePricePerAre: number | null;
  averagePricePerM2: number | null;
  comparables: EvaluatedComparableItem[];
  collateralAreaM2: number;
  onCollateralAreaChange: (area: number) => void;
  collateralLocationName?: string;
  collateralCoordinates?: { lat: number; lon: number };
}

export function determineBcePercentage(totalScore: number): number {
  if (totalScore <= 7) return 80;
  if (totalScore <= 11) return 75;
  if (totalScore <= 13) return 70;
  return 65;
}

export const BceCalculator: React.FC<BceCalculatorProps> = ({
  averagePricePerAre,
  averagePricePerM2,
  comparables,
  collateralAreaM2,
  onCollateralAreaChange,
}) => {
  // Numeric scores matching user's spreadsheet defaults (Wilayah: 3, Lokasi Jalan: 2, Kualitas Tanah: 3, Marketable: 2 -> Total: 10 -> BCE: 75)
  const [wilayahScore, setWilayahScore] = useState<number>(3);
  const [lokasiJalanScore, setLokasiJalanScore] = useState<number>(2);
  const [kualitasTanahScore, setKualitasTanahScore] = useState<number>(3);
  const [marketableScore, setMarketableScore] = useState<number>(2);

  const formatRupiah = (val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return `Rp ${Math.round(val).toLocaleString('id-ID')}`;
  };

  // Total Score Calculation
  const totalScore = useMemo(() => {
    return wilayahScore + lokasiJalanScore + kualitasTanahScore + marketableScore;
  }, [wilayahScore, lokasiJalanScore, kualitasTanahScore, marketableScore]);

  // BCE Predicate Percentage (80%, 75%, 70%, 65%)
  const bcePercentage = useMemo(() => {
    return determineBcePercentage(totalScore);
  }, [totalScore]);

  // Market prices from the 3 discounted comparables
  const effectiveMarketPricePerM2 = useMemo(() => {
    if (averagePricePerM2 !== null && averagePricePerM2 > 0) {
      return averagePricePerM2;
    }
    if (averagePricePerAre !== null && averagePricePerAre > 0) {
      return Math.round(averagePricePerAre / 100);
    }
    return null;
  }, [averagePricePerM2, averagePricePerAre]);

  const effectiveMarketPricePerAre = useMemo(() => {
    if (effectiveMarketPricePerM2 === null) return null;
    return effectiveMarketPricePerM2 * 100;
  }, [effectiveMarketPricePerM2]);

  const totalMarketValue = useMemo(() => {
    if (effectiveMarketPricePerM2 === null || collateralAreaM2 <= 0) return null;
    return Math.round(effectiveMarketPricePerM2 * collateralAreaM2);
  }, [effectiveMarketPricePerM2, collateralAreaM2]);

  return (
    <div id="bce-section" className="space-y-6">
      {/* 3 Comparables Summary Table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Hasil 3 Data Pembanding Terdiskon (Dasar Nilai Pasar)
            </h3>
            <p className="text-xs text-slate-500">
              Dihitung dari rata-rata harga setelah diskon (DC) pembanding yang dipilih oleh analis.
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {comparables.length} Pembanding
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">Data Pembanding</th>
                <th className="py-2.5 px-3">JDOP</th>
                <th className="py-2.5 px-3">Faktor DC</th>
                <th className="py-2.5 px-3">Penawaran Awal</th>
                <th className="py-2.5 px-3">Harga Setelah DC</th>
                <th className="py-2.5 px-3 text-right">Harga / Meter DC</th>
                <th className="py-2.5 px-3 text-right">Harga / Are DC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparables.map((item, idx) => (
                <tr key={`${item.url}-${idx}`} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 font-bold text-slate-500">{idx + 1}</td>
                  <td className="py-2.5 px-3">
                    <p className="max-w-xs truncate font-bold text-slate-900" title={item.referenceTitle}>
                      {item.referenceTitle}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {item.address || item.sourceName || 'Listing Bali'} • Luas {item.areaM2 ? `${item.areaM2} m²` : '—'}
                    </p>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-700">
                    {item.distanceMeters !== null ? `${item.distanceMeters} m` : '—'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-block rounded-md bg-violet-50 px-2 py-0.5 font-bold text-violet-700">
                      {item.discountFactor !== null ? `${Math.round(item.discountFactor * 100)}%` : '—'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 font-medium">
                    {formatRupiah(item.offerPrice)}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-blue-700">
                    {formatRupiah(item.discountedOfferPrice)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                    {formatRupiah(item.discountedPricePerM2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                    {formatRupiah(item.adjustedPricePerAre)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Input Luas Agunan Subjek & Rata-rata Pembanding */}
        <div className="mt-5 grid gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-blue-900">
              Luas Tanah Agunan yang Dinilai (m²)
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="1"
                value={collateralAreaM2 || ''}
                onChange={(e) => onCollateralAreaChange(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-bold text-blue-950 focus:border-blue-500 focus:outline-none"
                placeholder="Contoh: 250"
              />
              <span className="text-xs font-semibold text-blue-700">m²</span>
            </div>
            <p className="mt-1 text-[11px] text-blue-700">
              Setara {(collateralAreaM2 / 100).toFixed(2)} are
            </p>
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-600">
              Rata-rata Harga Pasar / m² (Setelah DC)
            </span>
            <div className="mt-1 text-base font-black text-slate-900">
              {formatRupiah(effectiveMarketPricePerM2)} / m²
            </div>
            <p className="text-[11px] text-slate-500">
              {formatRupiah(effectiveMarketPricePerAre)} / are
            </p>
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-600">
              Estimasi Nilai Pasar Agunan Total
            </span>
            <div className="mt-1 text-base font-black text-blue-800">
              {formatRupiah(totalMarketValue)}
            </div>
            <p className="text-[11px] text-slate-500">
              Sebelum dipotong persentase konservatif bank
            </p>
          </div>
        </div>
      </section>

      {/* SPREADSHEET KALKULATOR BCE (FORMAT PERSIS EXCEL) */}
      <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-900 sm:text-lg">
              KALKULATOR BCE
            </h2>
          </div>
        </div>

        {/* Tabel Kalkulator & Kategori Berdampingan */}
        <div className="mt-5 grid gap-6 md:grid-cols-12 items-start">
          {/* Kolom Kiri: Tabel KALKUATOR (Lebar 5 dari 12) */}
          <div className="md:col-span-5 overflow-hidden rounded border border-slate-400 font-sans shadow-xs">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#ffc000] text-slate-900 font-bold border-b border-slate-400">
                  <th colSpan={2} className="py-1.5 px-3 text-center uppercase tracking-wider font-extrabold text-sm">
                    KALKUATOR
                  </th>
                </tr>
                <tr className="border-b border-slate-300 bg-slate-100 font-bold text-slate-800">
                  <th className="py-1.5 px-3 text-left w-3/5 border-r border-slate-300">Uraian</th>
                  <th className="py-1.5 px-3 text-center w-2/5">Skor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 bg-white text-slate-900 font-medium">
                {/* A. Wilayah */}
                <tr>
                  <td className="py-2 px-3 border-r border-slate-300 font-semibold">A. Wilayah</td>
                  <td className="py-2 px-3 text-center">
                    <select
                      value={wilayahScore}
                      onChange={(e) => setWilayahScore(Number(e.target.value))}
                      className="w-16 rounded border border-slate-400 bg-white py-1 px-2 text-center text-sm font-bold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                    </select>
                  </td>
                </tr>

                {/* B. Lokasi Jalan */}
                <tr>
                  <td className="py-2 px-3 border-r border-slate-300 font-semibold">B. Lokasi Jalan</td>
                  <td className="py-2 px-3 text-center">
                    <select
                      value={lokasiJalanScore}
                      onChange={(e) => setLokasiJalanScore(Number(e.target.value))}
                      className="w-16 rounded border border-slate-400 bg-white py-1 px-2 text-center text-sm font-bold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </td>
                </tr>

                {/* C. Kualitas Tanah */}
                <tr>
                  <td className="py-2 px-3 border-r border-slate-300 font-semibold">C. Kualitas Tanah</td>
                  <td className="py-2 px-3 text-center">
                    <select
                      value={kualitasTanahScore}
                      onChange={(e) => setKualitasTanahScore(Number(e.target.value))}
                      className="w-16 rounded border border-slate-400 bg-white py-1 px-2 text-center text-sm font-bold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                    </select>
                  </td>
                </tr>

                {/* D. Marketable */}
                <tr>
                  <td className="py-2 px-3 border-r border-slate-300 font-semibold">D. Marketable</td>
                  <td className="py-2 px-3 text-center">
                    <select
                      value={marketableScore}
                      onChange={(e) => setMarketableScore(Number(e.target.value))}
                      className="w-16 rounded border border-slate-400 bg-white py-1 px-2 text-center text-sm font-bold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                    </select>
                  </td>
                </tr>

                {/* Total Row (Warna hijau muda lembut seperti di Excel) */}
                <tr className="bg-[#c6efce] text-[#006100] font-black border-t-2 border-slate-400">
                  <td className="py-2 px-3 border-r border-slate-400 uppercase">Total</td>
                  <td className="py-2 px-3 text-center text-sm font-black">{totalScore}</td>
                </tr>

                {/* HASIL BCE Row */}
                <tr className="bg-slate-100 text-slate-900 font-black border-t border-slate-400">
                  <td className="py-2.5 px-3 border-r border-slate-400 text-sm uppercase">HASIL BCE</td>
                  <td className="py-2.5 px-3 text-center text-lg font-black text-blue-700">{bcePercentage}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Kolom Tengah: Teks Keterangan (Lebar 3 dari 12) */}
          <div className="md:col-span-3 flex items-center justify-center p-4">
            <p className="text-xs italic leading-relaxed text-slate-600 font-medium text-center md:text-left">
              Isi kolom skor dengan mengacu pada kriteria terlampir
            </p>
          </div>

          {/* Kolom Kanan: Tabel KATEGORI BCE (Lebar 4 dari 12) */}
          <div className="md:col-span-4 overflow-hidden rounded border border-slate-400 font-sans shadow-xs">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400">
                  <th colSpan={2} className="py-1.5 px-3 text-center uppercase tracking-wider font-extrabold text-xs">
                    KATEGORI BCE
                  </th>
                </tr>
                <tr className="border-b border-slate-300 bg-slate-50 font-bold text-slate-700">
                  <th className="py-1.5 px-3 text-center border-r border-slate-300">Nilai</th>
                  <th className="py-1.5 px-3 text-center">Predikat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 bg-white text-slate-900">
                <tr className={totalScore >= 4 && totalScore <= 7 ? 'bg-amber-100 font-bold' : ''}>
                  <td className="py-2 px-3 border-r border-slate-300 text-center font-mono">
                    <span className="font-bold mr-1">4</span> 04-07
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-blue-800">
                    80 {totalScore >= 4 && totalScore <= 7 && <span className="text-emerald-600 font-black ml-1">◀</span>}
                  </td>
                </tr>
                <tr className={totalScore >= 8 && totalScore <= 11 ? 'bg-amber-100 font-bold' : ''}>
                  <td className="py-2 px-3 border-r border-slate-300 text-center font-mono">
                    <span className="font-bold mr-1">8</span> 08-11
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-blue-800">
                    75 {totalScore >= 8 && totalScore <= 11 && <span className="text-emerald-600 font-black ml-1">◀</span>}
                  </td>
                </tr>
                <tr className={totalScore >= 12 && totalScore <= 13 ? 'bg-amber-100 font-bold' : ''}>
                  <td className="py-2 px-3 border-r border-slate-300 text-center font-mono">
                    <span className="font-bold mr-1">12</span> 12-13
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-blue-800">
                    70 {totalScore >= 12 && totalScore <= 13 && <span className="text-emerald-600 font-black ml-1">◀</span>}
                  </td>
                </tr>
                <tr className={totalScore >= 14 && totalScore <= 18 ? 'bg-amber-100 font-bold' : ''}>
                  <td className="py-2 px-3 border-r border-slate-300 text-center font-mono">
                    <span className="font-bold mr-1">14</span> 14-18
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-blue-800">
                    65 {totalScore >= 14 && totalScore <= 18 && <span className="text-emerald-600 font-black ml-1">◀</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bar Kategori BCE Bawah (Kuning Terang seperti di Excel) */}
        <div className="mt-6 overflow-hidden rounded border border-slate-400">
          <div className="bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase text-slate-700 border-b border-slate-300">
            KATEGORI BCE
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <tbody>
                {/* Baris Persentase */}
                <tr className="bg-[#ffff00] text-slate-900 border-b border-slate-400">
                  <td className={`py-2 px-3 text-center font-extrabold border-r border-slate-400 w-1/6 ${bcePercentage === 65 ? 'bg-amber-300 ring-2 ring-inset ring-amber-600' : ''}`}>
                    65%
                  </td>
                  <td className={`py-2 px-3 text-center font-extrabold border-r border-slate-400 w-1/6 ${bcePercentage === 70 ? 'bg-amber-300 ring-2 ring-inset ring-amber-600' : ''}`}>
                    70%
                  </td>
                  <td className={`py-2 px-3 text-center font-extrabold border-r border-slate-400 w-1/6 ${bcePercentage === 75 ? 'bg-amber-300 ring-2 ring-inset ring-amber-600' : ''}`}>
                    75%
                  </td>
                  <td className={`py-2 px-3 text-center font-extrabold border-r border-slate-400 w-1/6 ${bcePercentage === 80 ? 'bg-amber-300 ring-2 ring-inset ring-amber-600' : ''}`}>
                    80%
                  </td>
                  <td className="py-2 px-3 font-bold border-r border-slate-400 w-1/4">
                    PERSENTASE BCE
                  </td>
                  <td className="py-2 px-3 text-slate-600 font-normal">
                    bank conservative evaluation
                  </td>
                </tr>
                {/* Baris Skor Kriteria */}
                <tr className="bg-[#ffff00] text-slate-900 border-b border-slate-400">
                  <td className={`py-2 px-3 text-center font-bold border-r border-slate-400 ${bcePercentage === 65 ? 'bg-amber-300 ring-2 ring-inset ring-amber-600' : ''}`}>
                    &gt;13
                  </td>
                  <td className={`py-2 px-3 text-center font-bold border-r border-slate-400 ${bcePercentage === 70 ? 'bg-amber-300 ring-2 ring-inset ring-amber-600' : ''}`}>
                    12-13
                  </td>
                  <td className={`py-2 px-3 text-center font-bold border-r border-slate-400 ${bcePercentage === 75 ? 'bg-amber-300 ring-2 ring-inset ring-amber-600' : ''}`}>
                    08-11
                  </td>
                  <td className={`py-2 px-3 text-center font-bold border-r border-slate-400 ${bcePercentage === 80 ? 'bg-amber-300 ring-2 ring-inset ring-amber-600' : ''}`}>
                    04-07
                  </td>
                  <td className="py-2 px-3 font-bold border-r border-slate-400">
                    SKOR BCE dari KRITERIA
                  </td>
                  <td className="py-2 px-3 text-slate-500 font-normal">
                    {totalScore <= 7 ? 'Predikat 80% (Skor 04-07)' : totalScore <= 11 ? 'Predikat 75% (Skor 08-11)' : totalScore <= 13 ? 'Predikat 70% (Skor 12-13)' : 'Predikat 65% (>13)'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* TABEL KRITERIA LENGKAP (SEDERHANA & MENYATU) */}
      <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
          KRITERIA :
        </h3>

        <div className="mt-4 space-y-5 text-xs text-slate-800 font-mono">
          {/* A. Wilayah */}
          <div>
            <div className="font-bold text-slate-900 mb-1">
              A. Wilayah Ruang Lingkup Asset
            </div>
            <div className="space-y-1 pl-4">
              <div className={wilayahScore === 1 ? 'font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : ''}>
                Kota Besar <span className="font-bold">1</span> = Kota yang memiliki sarana kota yang lengkap (Pusat Kota,-Pemukiman Padat)
              </div>
              <div className={wilayahScore === 2 ? 'font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : ''}>
                Kota Sedang <span className="font-bold">2</span> = Kota Berkembang, Sarana Kota Cukup (Kota-Kecamatan) - Pemukiman tidak padat
              </div>
              <div className={wilayahScore === 3 ? 'font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : ''}>
                Kota Kecil <span className="font-bold">3</span> = Sarana Kota Kurang Lengkap (Pusat Pedesaan)-Pemukiman Padat
              </div>
              <div className={wilayahScore === 4 ? 'font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : ''}>
                Daerah pedesaa <span className="font-bold">4</span> = Daerah perkampungan(Masih ada hutan)- Pemukiman tidak padat
              </div>
            </div>
          </div>

          {/* B. Lokasi Jalan */}
          <div>
            <div className="font-bold text-slate-900 mb-1">
              B. Lokasi Jalan
            </div>
            <div className="space-y-1 pl-4">
              <div className={lokasiJalanScore === 1 ? 'font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : ''}>
                Utama <span className="font-bold">1</span> = Jalan Protokol (Bypass/Akses Kendaraan Besar)
              </div>
              <div className={lokasiJalanScore === 2 ? 'font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : ''}>
                Rata-rata <span className="font-bold">2</span> = Lebar jalan diatas 5 meter (Akses Mobil)
              </div>
              <div className={lokasiJalanScore === 3 ? 'font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : ''}>
                Di bawah rata-rata <span className="font-bold">3</span> = Lebar jalan ≤ 5 meter (Akses Motor)
              </div>
            </div>
          </div>

          {/* C. Kualitas Tanah */}
          <div>
            <div className="font-bold text-slate-900 mb-1">
              C. Kualitas Kualitas Tanah
            </div>
            <div className="space-y-1 pl-4">
              <div className={kualitasTanahScore === 1 ? 'font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : ''}>
                Sangat Baik <span className="font-bold">1</span> = Tanah matang, sudah didirikan bangunan diatasnya
              </div>
              <div className={kualitasTanahScore === 2 ? 'font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : ''}>
                Baik <span className="font-bold">2</span> = Tanah matang, bisa didirikan bangunan diatasnya.
              </div>
              <div className={kualitasTanahScore === 3 ? 'font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : ''}>
                Sedang <span className="font-bold">3</span> = Di butuhkan sedikit penimbunan/perataan tanah sampai matang.
              </div>
              <div className={kualitasTanahScore === 4 ? 'font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : ''}>
                Jelek <span className="font-bold">4</span> = Tanah Gambut, rawa perlu banyak penimbunan
              </div>
              <div className={kualitasTanahScore === 5 ? 'font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : ''}>
                Sangat jelek <span className="font-bold">5</span> = Sangat banyak mengeluarkan biaya untuk mematangkan tanah menjadi matang
              </div>
            </div>
          </div>

          {/* D. Marketability */}
          <div>
            <div className="font-bold text-slate-900 mb-1">
              D. Marketability Daya Jual Asset
            </div>
            <div className="space-y-1 pl-4">
              <div className={marketableScore === 1 ? 'font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : ''}>
                Sangat Mudah <span className="font-bold">1</span> = Di sekitar lokasi aset banyak penawaran /penjualan property dekat fasum
              </div>
              <div className={marketableScore === 2 ? 'font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : ''}>
                Mudah <span className="font-bold">2</span> = Di sekitar lokasi aset banyak penawaran /penjualan property tidak memiliki fasum
              </div>
              <div className={marketableScore === 3 ? 'font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : ''}>
                Normal <span className="font-bold">3</span> = Di sekitar lokasi aset terdapat sedikit penawaran/penjualan property
              </div>
              <div className={marketableScore === 4 ? 'font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : ''}>
                Sulit <span className="font-bold">4</span> = Di sekitar lokasi aset terdapat sangat sedikit penawaran/penjualan property
              </div>
              <div className={marketableScore === 5 ? 'font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : ''}>
                Sangat Sulit <span className="font-bold">5</span> = Di sekitar lokasi aset tidak ada penawaran/penjualan property
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
