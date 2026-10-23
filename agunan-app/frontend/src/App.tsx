import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { BaliMarketSearchPage } from './pages/BaliMarketSearchPage';
import { RekapRekeningPage } from './pages/RekapRekeningPage';
import { LogbookRejectionPage } from './pages/LogbookRejectionPage';
import { Menu } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400">Memuat sesi portal perbankan...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar Navigasi (Desktop Sticky & Mobile Drawer) */}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Area Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Mobile Header Bar (Hanya tampil di layar kecil/ponsel untuk buka sidebar) */}
        <div className="md:hidden sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            >
              <Menu className="w-5 h-5" />
            </button>
            <img
              src="/saktilogo1.png"
              alt="SAKTI Logo"
              className="h-7 w-auto object-contain"
            />
          </div>
          <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px]">
            {user.full_name}
          </span>
        </div>

        {/* Konten Halaman */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route
              path="/"
              element={
                <ProtectedLayout>
                  <BaliMarketSearchPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/rekap-rekening"
              element={
                <ProtectedLayout>
                  <RekapRekeningPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/logbook-rejection"
              element={
                <ProtectedLayout>
                  <LogbookRejectionPage />
                </ProtectedLayout>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
