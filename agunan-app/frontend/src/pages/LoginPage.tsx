import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Building2, Lock, User, AlertCircle, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('analis1');
  const [password, setPassword] = useState('AnalisBank2026!');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      // Jika respons error mengindikasikan kredensial salah, tampilkan pesan khusus
      if (err?.response?.status === 401) {
        setError('Username atau password yang Anda masukkan salah.');
      } else {
        setError(err.response?.data?.detail || 'Terjadi kesalahan saat masuk.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-400 items-center justify-center shadow-xl shadow-blue-500/25 mb-4">
          <Building2 className="w-9 h-9 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          SISTEM ANALISA AGUNAN
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white/10 backdrop-blur-xl py-8 px-6 sm:px-8 shadow-2xl rounded-3xl border border-white/15 text-slate-800">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-400/30 text-red-200 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Username
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white/90 text-slate-900 rounded-xl text-sm border-0 focus:ring-2 focus:ring-blue-500 font-medium"
                  placeholder="Masukkan username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white/90 text-slate-900 rounded-xl text-sm border-0 focus:ring-2 focus:ring-blue-500 font-medium"
                  placeholder="Masukkan password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-600/30 transition-all card-hover disabled:opacity-50"
            >
              {isLoading ? 'Memverifikasi...' : 'Masuk ke Sistem Portal'}
            </button>
          </form>

          {/* Quick Demo Selector */}
          <div className="mt-6 pt-5 border-t border-white/10 text-xs">
            <div className="text-slate-300 font-semibold mb-2 text-center text-[11px] uppercase tracking-wider">
              Login Cepat Demo:
            </div>
            <button
              type="button"
              onClick={() => setDemoAccount('analis1', 'AnalisBank2026!')}
              className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 text-blue-200 rounded-lg text-center font-medium transition"
            >
              🏦 Analis Kredit — analis1
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
