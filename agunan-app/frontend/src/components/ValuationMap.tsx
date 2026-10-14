import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Agunan, ValuasiPembandingDetail, Pembanding } from '../types';

interface ValuationMapProps {
  agunan: Agunan;
  selectedComparables: ValuasiPembandingDetail[];
  allCandidates?: (Pembanding | any)[];
  effectiveRadiusMeters?: number;
  height?: string;
}

// Collateral Pin
const collateralIcon = L.divIcon({
  className: 'custom-collateral-pin',
  html: `
    <div style="position: relative; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
      <div style="background-color: #dc2626; color: white; padding: 7px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.5); border: 2.5px solid white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <div style="width: 3px; height: 8px; background-color: #dc2626;"></div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

// Helper create comparable icons
const createComparableIcon = (orderNumber: number, isSelected: boolean, sumber: string) => {
  let bgColor = '#0284c7'; // Blue for default
  if (sumber === 'LELANG') bgColor = '#9333ea'; // Purple
  else if (sumber === 'APPRAISAL_KJPP') bgColor = '#059669'; // Emerald
  else if (sumber === 'SURVEI') bgColor = '#d97706'; // Amber
  else if (sumber === 'LISTING') bgColor = '#64748b'; // Slate

  const scale = isSelected ? 'scale(1.1)' : 'scale(0.85); opacity: 0.7;';
  const border = isSelected ? '3px solid #ffffff' : '1.5px solid #ffffff';

  return L.divIcon({
    className: 'custom-comp-pin',
    html: `
      <div style="transform: translate(-50%, -50%) ${scale};">
        <div style="background-color: ${bgColor}; color: white; width: 30px; height: 30px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; box-shadow: 0 3px 10px rgba(0,0,0,0.25); border: ${border};">
          ${orderNumber}
        </div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const ChangeMapView: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

export const ValuationMap: React.FC<ValuationMapProps> = ({
  agunan,
  selectedComparables,
  allCandidates = [],
  effectiveRadiusMeters = 1000,
  height = '480px',
}) => {
  const center: [number, number] = [agunan.lat, agunan.lon];

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-md" style={{ height }}>
      {/* Legend Overlay */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-lg border border-slate-200/80 text-[11px] space-y-1.5 max-w-[200px]">
        <div className="font-bold text-slate-800 border-b pb-1 text-xs">Legenda Peta</div>
        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 rounded-full bg-red-600 border border-white shadow-sm flex-shrink-0"></div>
          <span className="text-slate-700 font-semibold">Subjek Agunan</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 border border-white shadow-sm flex-shrink-0"></div>
          <span className="text-slate-700">Appraisal KJPP</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 rounded-full bg-blue-600 border border-white shadow-sm flex-shrink-0"></div>
          <span className="text-slate-700">Appraisal Internal</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 rounded-full bg-purple-600 border border-white shadow-sm flex-shrink-0"></div>
          <span className="text-slate-700">Lelang Eksekusi</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 rounded-full bg-amber-600 border border-white shadow-sm flex-shrink-0"></div>
          <span className="text-slate-700">Survei Lapangan</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 rounded-full bg-slate-500 border border-white shadow-sm flex-shrink-0"></div>
          <span className="text-slate-700">Listing Penawaran</span>
        </div>
        <div className="pt-1 text-[10px] text-blue-700 font-medium">
          Lingkaran Radius: {effectiveRadiusMeters >= 1000 ? `${effectiveRadiusMeters / 1000} km` : `${effectiveRadiusMeters} m`}
        </div>
      </div>

      <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeMapView center={center} />

        {/* Collateral Pin Marker */}
        <Marker position={center} icon={collateralIcon}>
          <Popup className="custom-map-popup">
            <div className="p-3 bg-white text-xs space-y-1">
              <div className="font-bold text-slate-900 border-b pb-1 text-sm text-red-600 flex items-center justify-between">
                <span>SUBJEK AGUNAN</span>
                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-mono">
                  {agunan.kode_agunan}
                </span>
              </div>
              <p className="text-slate-600 line-clamp-2">{agunan.alamat}</p>
              <div className="grid grid-cols-2 gap-x-2 pt-1 font-medium text-slate-700">
                <div>Luas: <b>{agunan.luas_tanah} m²</b></div>
                <div>Legalitas: <b>{agunan.legalitas}</b></div>
                <div>Lebar Jalan: <b>{agunan.lebar_jalan} m</b></div>
                <div>Bentuk: <b>{agunan.bentuk_tanah}</b></div>
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Search Radius Circle */}
        <Circle
          center={center}
          radius={effectiveRadiusMeters}
          pathOptions={{
            color: '#0284c7',
            fillColor: '#0284c7',
            fillOpacity: 0.08,
            weight: 2,
            dashArray: '5, 8',
          }}
        />

        {/* Selected Comparables Markers */}
        {selectedComparables.map((comp, idx) => {
          // Cari lat & lon
          const lat = (comp as any).lat ?? (comp as any).pembanding?.lat ?? (allCandidates.find((c) => c.id === comp.pembanding_id)?.lat);
          const lon = (comp as any).lon ?? (comp as any).pembanding?.lon ?? (allCandidates.find((c) => c.id === comp.pembanding_id)?.lon);

          if (!lat || !lon) return null;

          return (
            <Marker
              key={`selected-${comp.pembanding_id}-${idx}`}
              position={[lat, lon]}
              icon={createComparableIcon(idx + 1, true, comp.sumber || 'SURVEI')}
            >
              <Popup className="custom-map-popup">
                <div className="p-3.5 bg-white text-xs space-y-1.5 w-60">
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="font-bold text-slate-900">Pembanding #{idx + 1}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700">
                      Skor: {comp.skor_akhir.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-700">
                    {comp.sumber} • {comp.kode_referensi}
                  </div>
                  <div className="text-slate-500 text-[11px]">Jarak: {comp.jarak_meter.toFixed(0)} meter dari agunan</div>
                  <div className="bg-slate-50 p-2 rounded-lg border space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Harga Asli:</span>
                      <span className="font-mono">{formatRupiah(comp.harga_asli_per_m2)}/m²</span>
                    </div>
                    <div className="flex justify-between text-blue-700 font-bold">
                      <span>Harga Adjusted:</span>
                      <span className="font-mono">{formatRupiah(comp.harga_adjusted_per_m2)}/m²</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Total Penyesuaian:</span>
                      <span className={comp.total_penyesuaian_pct >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {(comp.total_penyesuaian_pct * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {comp.is_override && (
                    <div className="text-[10px] bg-red-50 text-red-700 p-1 rounded font-semibold border border-red-200">
                      [Override]: {comp.alasan_override}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
