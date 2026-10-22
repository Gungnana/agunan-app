import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Globe,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Newspaper,
  Share2,
  Scale,
  BookmarkPlus,
  Loader2,
  User,
  RefreshCw,
  Building2,
  Sparkles,
} from 'lucide-react';
import {
  RejectionLogItem,
  ProfileSearchResponse,
  ProfileSearchResultItem,
} from '../types/rejectionLog';
import { rejectionLogApi } from '../api/rejectionLogApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: RejectionLogItem;
  onUpdateNegativeInfo?: (item: RejectionLogItem, updatedInfo: string) => Promise<void>;
}

type CategoryType = 'all' | 'news' | 'social' | 'negative';

export const CustomerProfileSearchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  item,
  onUpdateNegativeInfo,
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  const [customQuery, setCustomQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchData, setSearchData] = useState<ProfileSearchResponse | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchProfile = async (cat: CategoryType, queryOverride?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await rejectionLogApi.searchProfile({
        nama: item.nama,
        alamat: item.alamat,
        category: cat,
        q: queryOverride || undefined,
      });
      setSearchData(res);
      if (res.query && !customQuery) {
        setCustomQuery(res.query);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setErrorMessage('Terjadi gangguan saat memuat data pencarian internet.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && item) {
      setCustomQuery('');
      setActiveCategory('all');
      setSavedNote(null);
      fetchProfile('all');
    }
  }, [isOpen, item.id]);

  if (!isOpen) return null;

  const handleCategoryChange = (cat: CategoryType) => {
    setActiveCategory(cat);
    setCustomQuery('');
    fetchProfile(cat);
  };

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (customQuery.trim()) {
      fetchProfile(activeCategory, customQuery.trim());
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const handleSaveToNegativeInfo = async (result: ProfileSearchResultItem) => {
    if (!onUpdateNegativeInfo) return;
    const note = `[Temuan Web: ${result.source}] ${result.title} (${result.url})`;
    const currentInfo = item.informasi_negatif && item.informasi_negatif !== '-' ? item.informasi_negatif : '';
    const newInfo = currentInfo ? `${currentInfo} | ${note}` : note;

    try {
      await onUpdateNegativeInfo(item, newInfo);
      setSavedNote(result.url);
      setTimeout(() => setSavedNote(null), 3000);
    } catch (err) {
      console.error('Failed to update negative info:', err);
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'news':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'social':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'negative':
        return 'bg-rose-100 text-rose-800 border-rose-200 font-bold';
      default:
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
  };

  const getBadgeLabel = (type: string) => {
    switch (type) {
      case 'news':
        return '📰 Berita Online';
      case 'social':
        return '📱 Postingan / Medsos';
      case 'negative':
        return '⚠️ Rekam Jejak / Kasus';
      default:
        return '🌐 Artikel Web';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full my-6 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-indigo-900/50 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/30 text-violet-300 border border-violet-400/30 flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-400/30">
                  OSINT & Background Profiling
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-0.5 flex items-center space-x-2">
                <span>Pencarian Profil Internet:</span>
                <span className="text-violet-300 underline underline-offset-2">{item.nama}</span>
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Customer Context Strip */}
        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-slate-400">NIK/NPWP:</span>{' '}
              <span className="font-semibold text-slate-800">{item.nik_npwp || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400">Alamat:</span>{' '}
              <span className="font-semibold text-slate-800 truncate max-w-xs inline-block align-bottom">
                {item.alamat || '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Alasan Tolak:</span>{' '}
              <span className="font-semibold text-rose-600">{item.alasan_ditolak}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Pencarian artikel publik, media berita & media sosial</span>
          </div>
        </div>

        {/* Search Query Input Bar */}
        <div className="p-4 bg-white border-b border-slate-200 flex-shrink-0 space-y-3">
          <form onSubmit={handleCustomSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder={`Ketik kata kunci tambahan, misal: "${item.nama}" penipuan OR kasus OR toko...`}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md shadow-violet-600/20 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mencari...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Cari Ulang</span>
                </>
              )}
            </button>
          </form>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleCategoryChange('all')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                  activeCategory === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span>Semua Hasil</span>
              </button>

              <button
                type="button"
                onClick={() => handleCategoryChange('news')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                  activeCategory === 'news'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Newspaper className="w-3.5 h-3.5 text-emerald-500" />
                <span>Berita & Artikel</span>
              </button>

              <button
                type="button"
                onClick={() => handleCategoryChange('social')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                  activeCategory === 'social'
                    ? 'bg-white text-sky-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Share2 className="w-3.5 h-3.5 text-sky-500" />
                <span>Media Sosial & Postingan</span>
              </button>

              <button
                type="button"
                onClick={() => handleCategoryChange('negative')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                  activeCategory === 'negative'
                    ? 'bg-white text-rose-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>Jejak Kasus / Informasi Negatif</span>
              </button>
            </div>

            {/* Quick Count Badge */}
            {searchData && (
              <span className="text-[11px] font-semibold text-slate-500">
                Ditemukan <strong className="text-slate-800">{searchData.results.length}</strong> hasil pencarian
              </span>
            )}
          </div>
        </div>

        {/* Results Body (Scrollable) */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-slate-50/50">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                Sedang menelusuri artikel, postingan, dan database berita di internet...
              </p>
              <p className="text-xs text-slate-400">
                Mengecek nama &quot;{item.nama}&quot; pada media massa, jejaring sosial, dan putusan publik
              </p>
            </div>
          ) : errorMessage ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs text-center space-y-2">
              <AlertTriangle className="w-5 h-5 mx-auto text-rose-500" />
              <p className="font-semibold">{errorMessage}</p>
              <p>Anda tetap dapat menggunakan tombol pintasan pencarian langsung di bawah ini.</p>
            </div>
          ) : searchData && searchData.results.length > 0 ? (
            <div className="space-y-3">
              {searchData.results.map((res, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:border-violet-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      {/* Meta top: Badge + Source + Age */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] border ${getBadgeColor(res.type)}`}
                        >
                          {getBadgeLabel(res.type)}
                        </span>
                        <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                          <Globe className="w-3 h-3 text-slate-400" />
                          <span>{res.source}</span>
                        </span>
                        {res.published_date && (
                          <span className="text-[11px] text-slate-400">• {res.published_date}</span>
                        )}
                      </div>

                      {/* Title */}
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-slate-900 group-hover:text-violet-700 leading-snug flex items-center space-x-1.5"
                      >
                        <span dangerouslySetInnerHTML={{ __html: res.title }} />
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-600 flex-shrink-0" />
                      </a>

                      {/* Excerpt Snippet */}
                      <p
                        className="text-xs text-slate-600 leading-relaxed line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: res.description }}
                      />

                      {/* URL preview */}
                      <div className="text-[11px] text-slate-400 truncate max-w-xl">{res.url}</div>
                    </div>

                    {/* Actions on Card */}
                    <div className="flex flex-col sm:flex-row items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(res.url)}
                        title="Salin Tautan"
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                      >
                        {copiedUrl === res.url ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      {onUpdateNegativeInfo && (
                        <button
                          type="button"
                          onClick={() => handleSaveToNegativeInfo(res)}
                          title="Simpan artikel ini ke Informasi Negatif nasabah"
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all"
                        >
                          {savedNote === res.url ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Tersimpan!</span>
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="w-3.5 h-3.5 text-amber-600" />
                              <span>Catat di Info Negatif</span>
                            </>
                          )}
                        </button>
                      )}

                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shadow-sm"
                      >
                        <span>Buka</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">
                  Tidak Ditemukan Artikel atau Jejak Terindeks Langsung
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Nama nasabah belum memiliki catatan publik aktif dengan filter saat ini. Anda dapat
                  mencari secara langsung melalui tautan platform eksternal berikut:
                </p>
              </div>
            </div>
          )}

          {/* Quick Direct Links Dock (Google, News, Putusan MA, Medsos) */}
          <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-violet-600" />
                <span>Pencarian Langsung di Platform Resmi & Media Eksternal:</span>
              </span>
              <span className="text-[11px] text-slate-400">1-Klik Buka di Tab Baru</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(`"${item.nama}" Bali`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-slate-50 hover:bg-violet-50 hover:border-violet-300 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:text-violet-800 flex items-center justify-center space-x-1.5 transition-all text-center"
              >
                <Search className="w-3.5 h-3.5 text-blue-500" />
                <span>Google Web</span>
              </a>

              <a
                href={`https://news.google.com/search?q=${encodeURIComponent(`"${item.nama}"`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:text-emerald-800 flex items-center justify-center space-x-1.5 transition-all text-center"
              >
                <Newspaper className="w-3.5 h-3.5 text-emerald-500" />
                <span>Google Berita</span>
              </a>

              <a
                href={`https://putusan3.mahkamahagung.go.id/search.html?q=${encodeURIComponent(item.nama)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-slate-50 hover:bg-rose-50 hover:border-rose-300 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:text-rose-800 flex items-center justify-center space-x-1.5 transition-all text-center"
              >
                <Scale className="w-3.5 h-3.5 text-rose-500" />
                <span>Putusan MA RI</span>
              </a>

              <a
                href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(item.nama)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-slate-50 hover:bg-sky-50 hover:border-sky-300 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:text-sky-800 flex items-center justify-center space-x-1.5 transition-all text-center"
              >
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                <span>LinkedIn</span>
              </a>

              <a
                href={`https://www.facebook.com/search/top?q=${encodeURIComponent(item.nama)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-800 flex items-center justify-center space-x-1.5 transition-all text-center"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Facebook</span>
              </a>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Brave Search & Open Intelligence Network Active</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
