import React from 'react';
import { ShieldCheck, AlertTriangle, Info } from 'lucide-react';

interface ConfidenceBadgeProps {
  score?: number | null;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  score = 0,
  size = 'md',
  showDetails = false,
}) => {
  const safeScore = score ?? 0;

  let colorClass = 'bg-red-50 text-red-700 border-red-200';
  let tierLabel = 'Rendah';
  let icon = <AlertTriangle className="w-4 h-4 text-red-500" />;

  if (safeScore >= 80) {
    colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    tierLabel = 'Sangat Tinggi';
    icon = <ShieldCheck className="w-4 h-4 text-emerald-600" />;
  } else if (safeScore >= 65) {
    colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
    tierLabel = 'Baik';
    icon = <ShieldCheck className="w-4 h-4 text-blue-600" />;
  } else if (safeScore >= 50) {
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
    tierLabel = 'Cukup';
    icon = <Info className="w-4 h-4 text-amber-600" />;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5 font-bold',
  };

  return (
    <div className="inline-flex flex-col">
      <div className={`inline-flex items-center space-x-1.5 rounded-full border font-semibold ${colorClass} ${sizeClasses[size]}`}>
        {icon}
        <span>Confidence: {safeScore.toFixed(1)} / 100 ({tierLabel})</span>
      </div>
      {showDetails && safeScore < 60 && (
        <div className="text-[11px] text-amber-700 mt-1 flex items-center space-x-1">
          <span>⚠️ Disarankan verifikasi fisik tambahan atau appraisal eksternal KJPP.</span>
        </div>
      )}
    </div>
  );
};
