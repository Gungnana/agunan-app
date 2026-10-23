import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Globe,
  WalletCards,
  UserX,
  LogOut,
  User as UserIcon,
  Shield,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const menuSections = [
    {
      title: 'ANALISA & DATA PASAR',
      items: [
        {
          to: '/',
          label: 'Cari Harga Tanah',
          icon: Globe,
          roles: ['ANALIS', 'REVIEWER', 'ADMIN'],
        },
        {
          to: '/rekap-rekening',
          label: 'Rekap Rekening Koran',
          icon: WalletCards,
          roles: ['ANALIS', 'REVIEWER', 'ADMIN'],
        },
        {
          to: '/logbook-rejection',
          label: 'Logbook Rejection',
          icon: UserX,
          roles: ['ANALIS', 'REVIEWER', 'ADMIN'],
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-white select-none font-['Poppins',sans-serif]">
      {/* Header Bagian Atas: Logo SAKTI */}
      <div>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <img
            src="/saktilogo1.png"
            alt="SAKTI BPR Kertiawan"
            className="h-9 sm:h-10 w-auto object-contain"
          />
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Daftar Menu Navigasi */}
        <div className="py-2">
          {menuSections.map((section, idx) => (
            <div key={idx} className="mb-2">
              <div className="px-6 pt-5 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items
                  .filter((item) => (user ? item.roles.includes(user.role) : false))
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `relative flex items-center space-x-3.5 px-6 py-3 text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-blue-50/80 text-blue-600 font-semibold border-l-4 border-blue-600 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-l-4 border-transparent'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={`w-5 h-5 flex-shrink-0 transition-colors ${
                                isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Bagian Bawah: Profil Pengguna & Tombol Keluar */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between p-2 rounded-md bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">
                {user?.full_name || 'Analis'}
              </p>
              <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide truncate">
                {user?.role === 'ANALIS' ? 'Analis Kredit' : user?.role || 'User'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Keluar dari sistem"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors flex-shrink-0 ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Sticky, h-screen) */}
      <aside className="w-64 lg:w-72 bg-white border-r border-slate-200 h-screen sticky top-0 flex-shrink-0 hidden md:flex flex-col z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <aside className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl z-50 flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
