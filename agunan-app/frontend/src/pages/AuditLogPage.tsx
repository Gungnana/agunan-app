import React, { useState, useEffect } from 'react';
import { auditApi } from '../api/audit';
import { AuditLog } from '../types';
import { History, ShieldCheck, Filter, Search, Terminal } from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, any> = {};
      if (actionFilter) params.action = actionFilter;
      const data = await auditApi.getLogs(params);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const getActionBadge = (action: string) => {
    if (action.includes('OVERRIDE')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    } else if (action.includes('ANALISA')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (action.includes('LOGIN')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            Kepatuhan & Pengawasan
          </span>
          <span className="text-xs text-slate-400">• Immutable Audit Trail</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
          Jejak Audit Aktivitas Sistem (Audit Trail)
        </h1>
        <p className="text-xs text-slate-500">
          Seluruh aktivitas akses, eksekusi valuasi, dan override pembanding (beserta alasan analis) tersimpan permanen
          sesuai regulasi audit perbankan tanpa data pribadi debitur (PII redacted).
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-600">Filter Aktivitas:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-200 bg-white"
          >
            <option value="">Semua Aktivitas</option>
            <option value="OVERRIDE_PEMBANDING">OVERRIDE PEMBANDING</option>
            <option value="ANALISA_VALUASI">ANALISA VALUASI</option>
            <option value="LOGIN_BERHASIL">LOGIN BERHASIL</option>
            <option value="INPUT_AGUNAN">INPUT AGUNAN</option>
            <option value="EXPORT_PDF_VALUASI">EXPORT PDF</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Menampilkan <b>{logs.length}</b> rekaman log terakhir
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b">
              <tr>
                <th className="px-5 py-3">Waktu (WIB)</th>
                <th className="px-5 py-3">User ID</th>
                <th className="px-5 py-3">Aktivitas / Event</th>
                <th className="px-5 py-3">Entitas Terkait</th>
                <th className="px-5 py-3">IP Address</th>
                <th className="px-5 py-3">Rincian & Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {logs.map((log) => {
                const dateStr = new Date(log.created_at).toLocaleString('id-ID');
                const detailsStr = log.rincian_json ? JSON.stringify(log.rincian_json) : '-';

                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{dateStr}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-700">USER-{log.user_id || 'SYS'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full font-bold border text-[10px] font-sans ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-sans">
                      {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                    <td className="px-5 py-3.5 text-slate-700 max-w-md truncate font-sans text-xs">
                      {log.action === 'OVERRIDE_PEMBANDING' && log.rincian_json?.alasan ? (
                        <div className="text-amber-900 font-medium bg-amber-50 p-1.5 rounded border border-amber-200">
                          <b>Alasan Override:</b> "{log.rincian_json.alasan}"
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-[10px]">{detailsStr}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-sans">
                    Tidak ada rekaman audit log.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
