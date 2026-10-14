import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';

interface MapPickerProps {
  lat: number;
  lon: number;
  onChange: (lat: number, lon: number) => void;
  height?: string;
}

// Custom DivIcon for subject collateral pin
const collateralIcon = L.divIcon({
  className: 'custom-collateral-pin',
  html: `
    <div style="position: relative; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
      <div style="background-color: #dc2626; color: white; padding: 6px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4); border: 2px solid white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <div style="width: 2px; height: 6px; background-color: #dc2626;"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const MapEvents: React.FC<{ onChange: (lat: number, lon: number) => void }> = ({ onChange }) => {
  useMapEvents({
    click(e) {
      onChange(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
};

export const MapPicker: React.FC<MapPickerProps> = ({
  lat,
  lon,
  onChange,
  height = '350px',
}) => {
  const isIndonesia = lat >= -11.0 && lat <= 6.0 && lon >= 95.0 && lon <= 141.0;

  const quickLocations = [
    { name: 'Jakarta (Tebet)', lat: -6.2383, lon: 106.8528 },
    { name: 'Bandung (Dago)', lat: -6.8905, lon: 107.6105 },
    { name: 'Surabaya (Wonokromo)', lat: -7.2985, lon: 112.7380 },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-700 flex items-center">
            <MapPin className="w-3.5 h-3.5 mr-1 text-red-600" />
            Klik peta untuk menentukan titik agunan:
          </span>
          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border text-slate-700">
            {lat.toFixed(6)}, {lon.toFixed(6)}
          </span>
          {!isIndonesia && (
            <span className="text-red-600 font-semibold">⚠️ Di luar batas Indonesia</span>
          )}
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="text-slate-400">Preset:</span>
          {quickLocations.map((loc) => (
            <button
              key={loc.name}
              type="button"
              onClick={() => onChange(loc.lat, loc.lon)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded text-[11px] transition"
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-slate-300 shadow-sm" style={{ height }}>
        <MapContainer
          center={[lat, lon]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents onChange={onChange} />
          <Marker position={[lat, lon]} icon={collateralIcon} />
        </MapContainer>
      </div>
      <p className="text-[11px] text-slate-400">
        * Tip: Geser atau zoom peta, lalu klik tepat di kavling tanah agunan yang akan dinilai.
      </p>
    </div>
  );
};
