import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MapPin, WalletCards, UserX, Compass } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems = [
    { to: '/', label: 'Cari Harga Tanah', icon: MapPin, roles: ['ANALIS', 'REVIEWER', 'ADMIN'] },
    { to: '/validasi-bhumi', label: 'Validasi Bhumi BPN', icon: Compass, roles: ['ANALIS', 'REVIEWER', 'ADMIN'] },
    { to: '/rekap-rekening', label: 'Rekap Rekening Koran', icon: WalletCards, roles: ['ANALIS', 'REVIEWER', 'ADMIN'] },
    { to: '/logbook-rejection', label: 'Logbook Rejection', icon: UserX, roles: ['ANALIS', 'REVIEWER', 'ADMIN'] },
  ];

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
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
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
    </aside>
  );
};
