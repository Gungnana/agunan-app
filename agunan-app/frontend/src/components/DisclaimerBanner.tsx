import React from 'react';
import { AlertCircle } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 flex items-start space-x-3 shadow-sm">
      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
      <div className="leading-relaxed">
        <span className="font-bold">DISCLAIMER KEPATUHAN & REGULASI: </span>
        Sistem ini merupakan alat bantu estimasi indikasi awal nilai pasar agunan berbasis pengolahan data pasar (Market Data Approach). 
        Hasil perhitungan <span className="font-semibold underline">tidak menggantikan</span> Laporan Penilaian formal dari Penilai Publik Independen (KJPP) 
        terdaftar OJK/MAPPI apabila dipersyaratkan oleh regulasi Bank Indonesia, Otoritas Jasa Keuangan, maupun kebijakan internal bank.
      </div>
    </div>
  );
};
