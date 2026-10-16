import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor untuk menyisipkan JWT Authorization Bearer dan x-api-path
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('agunan_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Berikan header x-api-path agar backend Vercel serverless selalu mengetahui endpoint yang dituju
  if (config.url && config.headers) {
    config.headers['x-api-path'] = config.url;
  }
  return config;
});

// Interceptor tanggapan untuk menangani token kadaluarsa
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Hapus token dan alihkan ke login jika di browser
      localStorage.removeItem('agunan_token');
      localStorage.removeItem('agunan_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
