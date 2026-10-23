import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('analis1');
  const [password, setPassword] = useState('AnalisBank2026!');
  const [showPassword, setShowPassword] = useState(false);
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
      if (err?.response?.status === 401) {
        setError('Username atau password yang Anda masukkan salah.');
      } else {
        setError(err.response?.data?.detail || 'Terjadi kesalahan saat masuk.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = () => {
    setUsername('analis1');
    setPassword('AnalisBank2026!');
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-['Poppins',sans-serif]">
      {/* Kolom Kiri: Ilustrasi Geometris & Identitas Bank */}
      <div
        className="relative w-full md:w-[56%] lg:w-[58%] min-h-[280px] md:min-h-screen flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-cover bg-center bg-no-repeat select-none"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      >
        {/* Logo PT. BPR BANK KERTIAWAN di Kiri Atas */}
        <div className="z-10">
          <img
            src="/logo1.png"
            alt="PT. BPR BANK KERTIAWAN"
            className="h-8 sm:h-9 md:h-11 w-auto object-contain drop-shadow-sm"
          />
        </div>

        {/* Teks Judul Sistem di Kiri Bawah */}
        <div className="z-10 mt-10 md:mt-0 space-y-0.5">
          <h1 className="text-lg sm:text-xl md:text-[22px] font-semibold text-slate-800 tracking-tight leading-snug">
            Sistem Analis Kredit Terpadu
          </h1>
          <p className="text-base sm:text-lg md:text-[19px] font-medium text-slate-700 tracking-tight leading-snug">
            Internal (SAKTI) BPR Kertiawan
          </p>
        </div>
      </div>

      {/* Kolom Kanan: Form Login Putih Bersih */}
      <div className="w-full md:w-[44%] lg:w-[42%] bg-white flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 py-12 md:py-8 shadow-2xl md:shadow-none z-20">
        <div className="w-full max-w-[370px] space-y-5">
          {/* Header Form */}
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Login
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed">
              Selamat Datang Pada Sistem Codingan.Labs
              <br />
              Developer Group
            </p>
          </div>

          {/* Form Input */}
          <form className="space-y-4 pt-2" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Input Username */}
            <div>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan Username"
                className="w-full px-4 py-3 bg-white text-slate-800 placeholder-slate-400 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5065F6] focus:border-[#5065F6] transition"
              />
            </div>

            {/* Input Password */}
            <div className="relative flex items-center">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan Password"
                className="w-full px-4 py-3 pr-12 bg-white text-slate-800 placeholder-slate-400 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5065F6] focus:border-[#5065F6] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                className="absolute right-0 top-0 bottom-0 px-3.5 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border-l border-slate-300 rounded-r-md text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Tombol Masuk ->] */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-md text-sm font-bold text-white bg-[#5065F6] hover:bg-[#4357e8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5065F6] shadow-sm transition flex items-center justify-center space-x-1.5 disabled:opacity-60 cursor-pointer"
              >
                <span>{isLoading ? 'Memproses...' : 'Masuk'}</span>
                {!isLoading && (
                  <span className="flex items-center text-white text-sm font-bold">
                    <LogIn className="w-4 h-4 ml-1" />
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Helper */}
          <div className="pt-4 text-center">
            <button
              type="button"
              onClick={handleDemoFill}
              className="text-xs text-slate-400 hover:text-[#5065F6] transition underline decoration-dotted"
            >
              Isi otomatis akun demo (analis1)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
