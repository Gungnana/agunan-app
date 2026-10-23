import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck, LogOut, User as UserIcon, Building2 } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'REVIEWER':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'ANALIS':
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-md bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">Sistem Analisa Agunan</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Penilaian Agunan Tanah Berbasis Data Pasar</p>
            </div>
          </div>

          {/* User Profile & Actions */}
          {user && (
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800">{user.full_name}</span>
                <span className="text-[10px] text-blue-600 font-semibold tracking-wide uppercase">
                  {user.role === 'ANALIS' ? 'Analis Kredit' : user.role}
                </span>
              </div>
              <button
                onClick={logout}
                title="Keluar dari sistem"
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md border border-transparent hover:border-red-100 transition-colors flex items-center space-x-1.5 text-xs font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
