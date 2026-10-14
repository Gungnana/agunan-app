import React, { useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { AlertCircle, ExternalLink, MapPin, Search, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { marketSearchApi, MarketSearchResult } from '../api/marketSearch';

const baliBounds: [[number, number], [number, number]] = [[-9.0, 114.3], [-8.0, 115.9]];

const pinIcon = L.divIcon({
  className: 'market-search-pin',
  html: '<div style="background:#2563eb;color:white;border:3px solid white;border-radius:50% 50% 50% 0;width:28px;height:28px;transform:rotate(-45deg);box-shadow:0 2px 8px #0004"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const CoordinateMapEvents: React.FC<{ onPick: (lat: number, lon: number) => void }> = ({ onPick }) => {
  useMapEvents({
    click(event) {
      onPick(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6)));
    },
  });
  return null;
};

interface ComparisonDraft {
  propertyType: string;
  address: string;
  jdopMeters: string;
  areaM2: string;
  offerPrice: string;
  pricePerAre: string;
  sourceName: string;
}

export const BaliMarketSearchPage: React.FC = () => {
  const [lat, setLat] = useState(-8.65);
  const [lon, setLon] = useState(115.2167);
  const [landType, setLandType] = useState('tanah_kosong');
  const [landShape, setLandShape] = useState('persegi');
  const [result, setResult] = useState<MarketSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllReferences, setShowAllReferences] = useState(false);
  const [selectedReferenceUrls, setSelectedReferenceUrls] = useState<string[]>([]);
  const [comparisonDrafts, setComparisonDrafts] = useState<Record<string, ComparisonDraft>>({});

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSearching(true);
    setError(null);
    setResult(null);
    setShowAllReferences(false);
    setSelectedReferenceUrls([]);
    setComparisonDrafts({});
    try {
      setResult(await marketSearchApi.search(lat, lon, landType, landShape));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Pencarian gagal. Silakan coba kembali.');
    } finally {
      setIsSearching(false);
    }
  };
  const updateCoordinate = (nextLat: number, nextLon: number) => {
    setLat(nextLat);
    setLon(nextLon);
    setResult(null);
    setSelectedReferenceUrls([]);
    setComparisonDrafts({});
  };

  const formatRupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

  const toggleReference = (url: string) => {
    setSelectedReferenceUrls((selected) => {
      if (selected.includes(url)) {
        setComparisonDrafts((drafts) => {
          const next = { ...drafts };
          delete next[url];
          return next;
        });
        return selected.filter((item) => item !== url);
      }
      if (selected.length >= 3) return selected;
      const reference = result?.references.find((item) => item.url === url);
      if (reference) {
        const extracted = reference.comparison_data;
        const initialArea = reference.area_m2 !== null ? String(reference.area_m2) : '';
        const initialPricePerAre = reference.price_per_are !== null ? String(reference.price_per_are) : '';
        const initialOffer = reference.total_price !== null
          ? String(reference.total_price)
          : reference.price_per_are !== null && reference.area_m2 !== null
            ? String(Math.round(reference.price_per_are * reference.area_m2 / 100))
            : '';
        setComparisonDrafts((drafts) => ({
          ...drafts,
          [url]: {
            propertyType: extracted.property_type || landType.replace(/_/g, ' ').toUpperCase(),
            address: extracted.address || reference.matched_locality_area,
            jdopMeters: '',
            areaM2: initialArea,
            offerPrice: initialOffer,
            pricePerAre: initialPricePerAre,
            sourceName: extracted.source_name || reference.source,
          },
        }));
      }
      return [...selected, url];
    });
  };

  const updateComparisonDraft = (url: string, field: keyof ComparisonDraft, value: string) => {
    setComparisonDrafts((drafts) => {
      const current = drafts[url];
      if (!current) return drafts;
      const next = { ...current, [field]: value };
      const area = Number(field === 'areaM2' ? value : next.areaM2);
      const offer = Number(field === 'offerPrice' ? value : next.offerPrice);
      const perAre = Number(field === 'pricePerAre' ? value : next.pricePerAre);

      if (field === 'offerPrice' || field === 'areaM2') {
        if (next.areaM2.trim() && next.offerPrice.trim() && area > 0 && offer > 0) {
          next.pricePerAre = String(Math.round((offer / area) * 100));
        } else if (field === 'areaM2' && next.areaM2.trim() && next.pricePerAre.trim() && area > 0 && perAre > 0 && !next.offerPrice.trim()) {
          next.offerPrice = String(Math.round((perAre * area) / 100));
        }
      } else if (field === 'pricePerAre' && next.areaM2.trim() && value.trim() && area > 0 && perAre > 0) {
        next.offerPrice = String(Math.round((perAre * area) / 100));
      }

      return { ...drafts, [url]: next };
    });
  };

  const getDistanceFactor = (distance: number): number | null => {
    if (distance < 0 || distance > 1000) return null;
    if (distance <= 50) return 0.95;
    if (distance <= 100) return 0.90;
    if (distance <= 150) return 0.85;
    if (distance <= 200) return 0.80;
    if (distance <= 300) return 0.75;
    return 0.70;
  };

  const selectedReferences = result?.references.filter((reference) => selectedReferenceUrls.includes(reference.url)) || [];
  const evaluatedReferences = selectedReferences.map((reference) => {
    const draft = comparisonDrafts[reference.url];
    const distance = Number(draft?.jdopMeters);
    const factor = !draft?.jdopMeters?.trim() ? null : getDistanceFactor(distance);
    const areaM2 = Number(draft?.areaM2);
    const offerPrice = Number(draft?.offerPrice);
    const enteredPricePerAre = Number(draft?.pricePerAre);
    const basePricePerAre = draft?.pricePerAre?.trim() && Number.isFinite(enteredPricePerAre) && enteredPricePerAre > 0
      ? enteredPricePerAre
      : draft?.offerPrice?.trim() && draft?.areaM2?.trim() && Number.isFinite(offerPrice) && Number.isFinite(areaM2) && offerPrice > 0 && areaM2 > 0
        ? (offerPrice / areaM2) * 100
        : null;
    const effectiveOfferPrice = draft?.offerPrice?.trim() && Number.isFinite(offerPrice) && offerPrice > 0
      ? offerPrice
      : basePricePerAre !== null && Number.isFinite(areaM2) && areaM2 > 0
        ? (basePricePerAre * areaM2) / 100
        : null;
    const discountedOfferPrice = factor !== null && effectiveOfferPrice !== null
      ? Math.round(effectiveOfferPrice * factor)
      : null;
    const discountedPricePerM2 = discountedOfferPrice !== null && Number.isFinite(areaM2) && areaM2 > 0
      ? Math.round(discountedOfferPrice / areaM2)
      : null;
    return {
      reference,
      draft,
      distance,
      factor,
      basePricePerAre,
      adjustedPricePerAre: factor !== null && basePricePerAre !== null ? Math.round(basePricePerAre * factor) : null,
      effectiveOfferPrice,
      discountedOfferPrice,
      discountedPricePerM2,
    };
  });
  const allDistancesValid = evaluatedReferences.length === 3 && evaluatedReferences.every((item) => item.factor !== null);
  const pricedEvaluations = evaluatedReferences.filter((item) => item.adjustedPricePerAre !== null);
  const adjustedAveragePerAre = allDistancesValid && pricedEvaluations.length > 0
    ? Math.round(pricedEvaluations.reduce((total, item) => total + (item.adjustedPricePerAre || 0), 0) / pricedEvaluations.length)
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
          <Sparkles className="h-3.5 w-3.5" /> Pencarian referensi pasar • Bali
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Harga tanah di sekitar lokasi</h1>
        <p className="max-w-2xl text-sm text-slate-600">Pilih satu titik koordinat. Sistem mencari referensi harga tanah di internet pada area Bali terdekat.</p>
      </header>

      <form onSubmit={handleSearch} className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Titik lokasi agunan</h2>
          </div>
          <label className="block text-xs font-semibold text-slate-600">Koordinat (latitude, longitude)
            <input
              type="text"
              inputMode="decimal"
              required
              value={`${lat}, ${lon}`}
              onChange={(e) => {
                const coordinates = e.target.value.split(',').map((value) => Number(value.trim()));
                if (coordinates.length === 2 && coordinates.every(Number.isFinite)) {
                  updateCoordinate(coordinates[0], coordinates[1]);
                }
              }}
              aria-describedby="coordinate-format"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm text-slate-900"
            />
            <span id="coordinate-format" className="mt-1 block text-[11px] font-normal text-slate-400">Contoh: -8.650000, 115.216700</span>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">Tipe tanah
              <select value={landType} onChange={(e) => setLandType(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900">
                <option value="tanah_kosong">Tanah kosong</option>
                <option value="kavling_perumahan">Kavling perumahan</option>
                <option value="pertanian_perkebunan">Pertanian / perkebunan</option>
                <option value="komersial">Komersial</option>
                <option value="pariwisata">Pariwisata</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">Bentuk tanah
              <select value={landShape} onChange={(e) => setLandShape(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900">
                <option value="persegi">Persegi</option>
                <option value="persegi_panjang">Persegi panjang</option>
                <option value="tidak_beraturan">Tidak beraturan</option>
                <option value="segitiga">Segitiga</option>
                <option value="l">Bentuk L</option>
                <option value="lainnya">Lainnya / tidak diketahui</option>
              </select>
            </label>
          </div>
          <button type="submit" disabled={isSearching} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
            <Search className="h-4 w-4" /> {isSearching ? 'Mencari referensi…' : 'Cari harga tanah sekitar'}
          </button>
          <p className="text-[11px] leading-relaxed text-slate-400">Tipe dan bentuk tanah digunakan sebagai kata kunci tambahan pencarian. Karena banyak iklan tidak mencantumkan bentuk bidang, pencarian dapat diperluas otomatis agar referensi tetap ditemukan.</p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3 text-xs font-semibold text-slate-600">Pilih lokasi di peta Bali</div>
          <MapContainer center={[lat, lon]} zoom={9} minZoom={8} maxBounds={baliBounds} maxBoundsViscosity={1} style={{ height: 330, width: '100%' }} scrollWheelZoom>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <CoordinateMapEvents onPick={updateCoordinate} />
            <Marker position={[lat, lon]} icon={pinIcon} />
          </MapContainer>
          <div className="px-5 py-3 font-mono text-xs text-slate-500">{lat.toFixed(6)}, {lon.toFixed(6)}</div>
        </section>
      </form>

      {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p></div>}

      {result && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Referensi di sekitar {result.location.area}</h2>
              <p className="text-xs text-slate-500">{result.location.display_name} • {result.references.length} referensi internet, termasuk {result.facebook_public_result_count} hasil publik Facebook</p>
              <p className="mt-1 text-xs text-slate-500">Kriteria: {result.search_criteria.land_type.replace(/_/g, ' ')} • bentuk {result.search_criteria.land_shape.replace(/_/g, ' ')}</p>
              <p className="mt-1 text-xs text-slate-500">Jalan/gang dekat titik: <b className="text-slate-700">{result.location.street || 'Tidak teridentifikasi di peta'}</b></p>
              <p className="mt-1 text-xs text-slate-500">Cakupan telusur: {result.search_criteria.locality_queries.map((item) => `${item.level} ${item.area} (${item.result_count})`).join(' → ')}</p>
              <p className="mt-1 text-xs font-semibold text-emerald-700">Jenis referensi: {result.search_criteria.reference_scope}{result.search_criteria.detail_queries.length > 0 ? ` • pencarian detail ${result.search_criteria.detail_queries.map((item) => `${item.portal} (${item.result_count})`).join(', ')}` : ''} • {result.search_criteria.detail_pages_enriched} halaman detail berhasil dibaca</p>
            </div>
          </div>
          {result.references.length ? <>
            <div className="grid gap-3 md:grid-cols-2">
            {result.references.slice(0, showAllReferences ? result.references.length : 4).map((reference, index) => (
              <article key={`${reference.url}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-blue-700">{reference.source}{reference.url.toLowerCase().includes('facebook.com') ? ' • hasil publik Facebook' : ''}{reference.reference_kind === 'individual_listing' ? ' • halaman detail properti' : ' • halaman pencarian umum'}</div>
                <h3 className="font-bold leading-snug text-slate-900">{reference.title}</h3>
                <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700">Ditemukan lewat kueri {reference.matched_locality_level}: {reference.matched_locality_area}</span>
                {reference.price_mentions.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{reference.price_mentions.slice(0, 3).map((price, priceIndex) => <span key={`${price}-${priceIndex}`} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">{price.trim()}</span>)}</div>}
                <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-slate-600">{reference.description || 'Buka halaman sumber untuk melihat rincian penawaran.'}</p>
                {(reference.comparison_data.property_type || reference.comparison_data.address || reference.comparison_data.width_m || reference.comparison_data.dimensions_m || reference.comparison_data.facing || reference.comparison_data.road_access || reference.comparison_data.zoning || reference.comparison_data.listing_description || reference.comparison_data.nearby.length > 0) && <details className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                  <summary className="cursor-pointer text-xs font-bold text-blue-900">Rincian tambahan dari halaman referensi</summary>
                  <dl className="mt-2 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
                    {reference.comparison_data.property_type && <div><dt className="font-semibold text-slate-500">Jenis properti</dt><dd className="mt-0.5 text-slate-800">{reference.comparison_data.property_type}</dd></div>}
                    {reference.comparison_data.address && <div className="sm:col-span-2"><dt className="font-semibold text-slate-500">Alamat pada listing</dt><dd className="mt-0.5 text-slate-800">{reference.comparison_data.address}</dd></div>}
                    {reference.comparison_data.width_m && <div><dt className="font-semibold text-slate-500">Lebar tanah</dt><dd className="mt-0.5 text-slate-800">± {reference.comparison_data.width_m} m</dd></div>}
                    {reference.comparison_data.dimensions_m && <div><dt className="font-semibold text-slate-500">Dimensi bidang</dt><dd className="mt-0.5 text-slate-800">{reference.comparison_data.dimensions_m}</dd></div>}
                    {reference.comparison_data.facing && <div><dt className="font-semibold text-slate-500">Arah hadap</dt><dd className="mt-0.5 text-slate-800">{reference.comparison_data.facing}</dd></div>}
                    {reference.comparison_data.road_access && <div><dt className="font-semibold text-slate-500">Akses</dt><dd className="mt-0.5 text-slate-800">{reference.comparison_data.road_access}</dd></div>}
                    {reference.comparison_data.zoning && <div><dt className="font-semibold text-slate-500">Zonasi / ITR</dt><dd className="mt-0.5 text-slate-800">{reference.comparison_data.zoning}</dd></div>}
                    {reference.comparison_data.nearby.length > 0 && <div className="sm:col-span-2"><dt className="font-semibold text-slate-500">Keterangan jarak / fasilitas sekitar</dt><dd className="mt-0.5 text-slate-800">{reference.comparison_data.nearby.join(' • ')}</dd></div>}
                    {reference.comparison_data.listing_description && <div className="sm:col-span-2"><dt className="font-semibold text-slate-500">Deskripsi halaman sumber</dt><dd className="mt-0.5 line-clamp-5 whitespace-pre-line text-slate-700">{reference.comparison_data.listing_description}</dd></div>}
                  </dl>
                  <p className="mt-2 text-[10px] text-slate-400">{reference.comparison_data.page_enriched ? 'Dibaca dari halaman detail properti.' : 'Informasi tambahan terbatas pada metadata yang terindeks mesin pencari.'}</p>
                </details>}
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Luas</p>
                    <p className="mt-1 text-xs font-bold text-slate-800">{reference.area_m2 !== null ? `${reference.area_m2.toLocaleString('id-ID')} m²` : 'Tidak tercantum'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{reference.total_price_is_estimate ? 'Harga tanah (estimasi)' : 'Harga tanah'}</p>
                    <p className="mt-1 text-xs font-bold text-slate-800">{reference.total_price !== null ? formatRupiah(reference.total_price) : 'Tidak tercantum'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Harga / are</p>
                    <p className="mt-1 text-xs font-bold text-blue-800">{reference.price_per_are !== null ? formatRupiah(reference.price_per_are) : 'Tidak tercantum'}</p>
                  </div>
                </div>
                {reference.summary_note && <p className="mt-1 text-[10px] text-slate-400">{reference.summary_note}</p>}
                <a href={reference.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900">Lihat harga dan detail sumber <ExternalLink className="h-3.5 w-3.5" /></a>
                <button
                  type="button"
                  disabled={!selectedReferenceUrls.includes(reference.url) && selectedReferenceUrls.length >= 3}
                  onClick={() => toggleReference(reference.url)}
                  className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition ${selectedReferenceUrls.includes(reference.url) ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700'} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
                  title={!selectedReferenceUrls.includes(reference.url) && selectedReferenceUrls.length >= 3 ? 'Maksimal pilih 3 referensi' : undefined}
                >
                  {selectedReferenceUrls.includes(reference.url) ? '✓ Referensi dipilih' : 'Pilih untuk penilaian jarak'}
                </button>
              </article>
            ))}
            </div>
            {result.references.length > 4 && <button type="button" onClick={() => setShowAllReferences((shown) => !shown)} className="mx-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700">
              {showAllReferences ? <><ChevronUp className="h-4 w-4" /> Tampilkan lebih sedikit</> : <><ChevronDown className="h-4 w-4" /> Tampilkan semua {result.references.length} referensi</>}
            </button>}
          </> : <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Belum ada referensi yang ditemukan untuk area ini.</div>}
          <section aria-labelledby="distance-review-heading" className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 id="distance-review-heading" className="text-sm font-bold text-slate-900">Data Pembanding Lapangan</h3>
                <p className="mt-1 text-xs text-slate-600">Pilih hingga 3 referensi. Data yang terbaca dari listing diisi otomatis; kolom kosong dapat dilengkapi manual. JDOP menentukan Discount %, Harga Setelah DC, dan Harga/Meter.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-violet-800">{selectedReferenceUrls.length}/3 dipilih</span>
            </div>
            <div className="mt-4 space-y-3">
              {evaluatedReferences.map(({ reference, draft, factor, basePricePerAre, effectiveOfferPrice, discountedOfferPrice, discountedPricePerM2 }, index) => {
                if (!draft) return null;
                const fieldClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 placeholder:text-slate-400';
                const labelClass = 'block text-[11px] font-semibold text-slate-600';
                return (
                  <article key={reference.url} className="rounded-xl border border-violet-100 bg-white p-4">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700">Data Pembanding Lapangan {index + 1}</p>
                        <p className="truncate text-sm font-bold text-slate-900">{reference.title}</p>
                        <a href={reference.url} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-blue-700 hover:underline">Buka referensi sumber</a>
                      </div>
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-800">{factor === null ? 'Isi JDOP' : `Discount ${Math.round(factor * 100)}%`}</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <label className={labelClass}>Jenis
                        <input value={draft.propertyType} onChange={(event) => updateComparisonDraft(reference.url, 'propertyType', event.target.value)} placeholder="TANAH KOSONG" className={fieldClass} />
                      </label>
                      <label className={labelClass}>Alamat
                        <input value={draft.address} onChange={(event) => updateComparisonDraft(reference.url, 'address', event.target.value)} placeholder="Jalan, desa, kecamatan, kabupaten" className={fieldClass} />
                      </label>
                      <label className={labelClass}>JDOP / jarak ke agunan (meter)
                        <input type="number" min={0} max={1000} step="1" value={draft.jdopMeters} onChange={(event) => updateComparisonDraft(reference.url, 'jdopMeters', event.target.value)} placeholder="Contoh: 450" className={fieldClass} />
                      </label>
                      <label className={labelClass}>Discount % (otomatis dari JDOP)
                        <input readOnly value={factor === null ? '' : `${Math.round(factor * 100)}%`} placeholder="Isi JDOP" className={`${fieldClass} bg-slate-50 font-bold`} />
                      </label>
                      <label className={labelClass}>Luas tanah (m²)
                        <input type="number" min={0} step="0.01" value={draft.areaM2} onChange={(event) => updateComparisonDraft(reference.url, 'areaM2', event.target.value)} placeholder="Isi jika diketahui" className={fieldClass} />
                      </label>
                      <label className={labelClass}>Penawaran (Rp total)
                        <input type="number" min={0} step="1000" value={draft.offerPrice} onChange={(event) => updateComparisonDraft(reference.url, 'offerPrice', event.target.value)} placeholder="Masukkan harga total" className={fieldClass} />
                      </label>
                      <label className={labelClass}>Harga per are (opsional, input manual)
                        <input type="number" min={0} step="1000" value={draft.pricePerAre} onChange={(event) => updateComparisonDraft(reference.url, 'pricePerAre', event.target.value)} placeholder={basePricePerAre === null ? 'Tidak tersedia' : formatRupiah(basePricePerAre)} className={fieldClass} />
                      </label>
                      <div className="rounded-lg bg-blue-50 p-2.5">
                        <p className={labelClass}>Harga Setelah DC</p>
                        <p className="mt-2 text-sm font-black text-blue-800">{discountedOfferPrice === null ? '—' : formatRupiah(discountedOfferPrice)}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-2.5">
                        <p className={labelClass}>Harga / Meter setelah DC</p>
                        <p className="mt-2 text-sm font-black text-emerald-800">{discountedPricePerM2 === null ? '—' : formatRupiah(discountedPricePerM2)}</p>
                      </div>
                      <label className={labelClass}>Sumber data
                        <input value={draft.sourceName} onChange={(event) => updateComparisonDraft(reference.url, 'sourceName', event.target.value)} placeholder="Nama agen / website" className={fieldClass} />
                      </label>
                    </div>
                    <p className="mt-3 text-[10px] leading-relaxed text-slate-400">Bidang terisi otomatis berdasarkan cuplikan referensi bila informasinya ditemukan. Periksa sumber dan koreksi/lengkapi data secara manual. Harga Setelah DC = Penawaran × Discount; Harga/Meter = Harga Setelah DC ÷ Luas Tanah.</p>
                  </article>
                );
              })}
              {selectedReferences.length === 0 && <p className="rounded-xl border border-dashed border-violet-200 bg-white/70 p-4 text-center text-xs text-slate-500">Pilih hingga 3 referensi dari seluruh daftar di atas. Data listing akan diisi otomatis jika tersedia dan kolom kosong dapat dilengkapi manual.</p>}
            </div>
            {allDistancesValid && adjustedAveragePerAre !== null ? (
              <div className="mt-4 rounded-xl border border-violet-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-violet-800">Indikasi rata-rata setelah faktor jarak dari {pricedEvaluations.length} referensi yang memiliki harga</p>
                <p className="mt-1 text-xl font-black text-slate-900">{formatRupiah(adjustedAveragePerAre)} / are</p>
                <p className="text-sm font-bold text-emerald-700">{formatRupiah(Math.round(adjustedAveragePerAre / 100))} / m²</p>
                {pricedEvaluations.length < 3 && <p className="mt-2 text-xs text-amber-700">Rata-rata harga memakai {pricedEvaluations.length} referensi yang memiliki harga per are, termasuk input manual bila ada. Referensi tanpa harga tetap dinilai faktor jaraknya.</p>}
              </div>
            ) : allDistancesValid ? (
              <p className="mt-3 text-xs text-amber-800">Ketiga faktor jarak berhasil dinilai, tetapi tidak ada harga per are yang tersedia untuk menghitung indikasi rata-rata.</p>
            ) : selectedReferences.length > 0 ? (
              <p className="mt-3 text-xs text-amber-800">Lengkapi jarak ketiga referensi (maksimal 1.000 meter) untuk menghitung indikasi rata-rata setelah faktor jarak.</p>
            ) : null}
            <details className="mt-4 rounded-xl border border-violet-100 bg-white/80 p-3">
              <summary className="cursor-pointer text-xs font-bold text-slate-700">Lihat acuan faktor jarak</summary>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-3">
                <span>≤50 m: 95%</span><span>51–100 m: 90%</span><span>101–150 m: 85%</span><span>151–200 m: 80%</span><span>201–300 m: 75%</span><span>&gt;300 m–1 km: 70%</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Faktor diterapkan dengan mengalikan harga sumber (contoh: harga × 95%). Jarak tidak tersedia secara andal dari hasil web, jadi masukkan jarak hasil ukur/verifikasi user. Jarak di atas 1 km tidak masuk tabel acuan.</p>
            </details>
          </section>
          <section aria-labelledby="area-context-heading" className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-700" />
                <h3 id="area-context-heading" className="text-sm font-bold text-slate-900">Kondisi area sekitar titik</h3>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">Radius {result.area_context.radius_m} m</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{result.area_context.summary}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white bg-white/90 p-3">
                <p className="text-xs font-semibold text-slate-500">Bangunan terpetakan</p>
                <p className="mt-1 text-lg font-black text-slate-900">{result.area_context.building_count === null ? 'Tidak tersedia' : result.area_context.building_count.toLocaleString('id-ID')}</p>
              </div>
              {result.area_context.observed_categories.length > 0 && <div className="rounded-xl border border-white bg-white/90 p-3">
                <p className="text-xs font-semibold text-slate-500">Objek penggunaan lahan</p>
                <ul className="mt-1 space-y-1">{result.area_context.observed_categories.map((item) => <li key={item.category} className="flex justify-between gap-3 text-xs text-slate-700"><span>{item.category}</span><b>{item.feature_count.toLocaleString('id-ID')}</b></li>)}</ul>
              </div>}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Sumber: {result.area_context.source}. {result.area_context.caveat || 'Data area belum tersedia; referensi harga tetap dapat digunakan.'} Kondisi areal menjadi konteks kualitatif kesimpulan; tidak digunakan sebagai pengali harga otomatis.</p>
          </section>
          <section aria-labelledby="market-summary-heading" className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-700" />
              <h3 id="market-summary-heading" className="text-sm font-bold text-slate-900">Kesimpulan indikasi harga tanah dan kondisi areal</h3>
            </div>
            {result.market_summary.price_per_are && result.market_summary.price_per_m2 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white bg-white/90 p-4">
                  <p className="text-xs font-semibold text-slate-500">Harga indikatif per are (100 m²)</p>
                  <p className="mt-1 text-xl font-black text-blue-800">{formatRupiah(result.market_summary.price_per_are.median)}</p>
                  <p className="mt-1 text-xs text-slate-500">Rentang terdeteksi: {formatRupiah(result.market_summary.price_per_are.minimum)} – {formatRupiah(result.market_summary.price_per_are.maximum)}</p>
                </div>
                <div className="rounded-xl border border-white bg-white/90 p-4">
                  <p className="text-xs font-semibold text-slate-500">Harga indikatif per m²</p>
                  <p className="mt-1 text-xl font-black text-emerald-700">{formatRupiah(result.market_summary.price_per_m2.median)}</p>
                  <p className="mt-1 text-xs text-slate-500">Rentang terdeteksi: {formatRupiah(result.market_summary.price_per_m2.minimum)} – {formatRupiah(result.market_summary.price_per_m2.maximum)}</p>
                </div>
              </div>
            ) : null}
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{result.market_summary.price_conclusion}</p>
            <div className="mt-3 rounded-xl border border-blue-100 bg-white/80 p-3">
              <p className="text-xs font-bold text-blue-900">Pengaruh konteks areal pada indikasi</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{result.market_summary.area_implication}</p>
            </div>
            {result.market_summary.sample_count > 0 && <p className="mt-2 text-[11px] text-slate-500">Dihitung dari {result.market_summary.sample_count} kutipan harga yang mencantumkan satuan eksplisit; nominal total tanpa luas/satuan tidak dimasukkan.</p>}
          </section>
          <p className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600">Sistem memprioritaskan halaman detail properti individual yang terindeks (misalnya iklan Lamudi, Rumah123, Marketplace, dan posting grup publik), bukan halaman kategori. Bila Brave tidak menemukan halaman detail, hasil portal umum dapat ditampilkan sebagai fallback. Hasil Facebook hanya berasal dari halaman yang terindeks publik; konten grup privat atau yang perlu login tidak dapat diambil. Verifikasi detail listing langsung pada tautan sumber.</p>
          <p className="rounded-xl bg-slate-100 p-3 text-xs leading-relaxed text-slate-600">{result.note} Pencarian menggunakan nama area dari koordinat; kedekatan persis per listing tidak selalu tersedia.</p>
        </section>
      )}
    </div>
  );
};
