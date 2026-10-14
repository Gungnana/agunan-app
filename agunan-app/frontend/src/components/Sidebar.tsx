import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MapPin, ShieldCheck } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems = [{ to: '/', label: 'Cari Harga Tanah', icon: MapPin, roles: ['ANALIS', 'REVIEWER', 'ADMIN'] }];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Menu Navigasi
        </div>
        {navItems
          .filter((item) => (user ? item.roles.includes(user.role) : false))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-5 h-5 text-current" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
      </div>

      {/* Compliance Badge Footnote */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 flex items-start space-x-2">
        <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-semibold text-slate-700">Area layanan Bali</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Hasil pencarian menautkan ke sumber internet.</p>
        </div>
      </div>
    </aside>
  );
};
