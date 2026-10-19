import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { BaliMarketSearchPage } from './pages/BaliMarketSearchPage';
import { PengajuanListPage } from './pages/PengajuanListPage';
import { ValuasiAnalisaPage } from './pages/ValuasiAnalisaPage';
import { ComparableDatabasePage } from './pages/ComparableDatabasePage';
import { ParameterPage } from './pages/ParameterPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { RekapRekeningPage } from './pages/RekapRekeningPage';

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
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
              path="/pengajuan"
              element={
                <ProtectedLayout>
                  <PengajuanListPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/valuasi"
              element={
                <ProtectedLayout>
                  <ValuasiAnalisaPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/pembanding"
              element={
                <ProtectedLayout>
                  <ComparableDatabasePage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/parameter"
              element={
                <ProtectedLayout>
                  <ParameterPage />
                </ProtectedLayout>
              }
            />
            <Route
              path="/audit"
              element={
                <ProtectedLayout>
                  <AuditLogPage />
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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
