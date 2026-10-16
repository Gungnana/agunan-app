# Bali Land Market Search

A React/Vite frontend searches publicly indexed Bali land listings using Brave Search. A FastAPI backend resolves coordinates, searches listing pages, and optionally enriches public listing details. MySQL stores the existing application data.

## Local Docker

1. Copy `.env.example` to `.env`.
2. Set unique values for `SECRET_KEY`, database passwords, and initial account passwords. Set `BRAVE_SEARCH_API_KEY` to enable web search.
3. Run `docker compose up --build -d` from the repository root.
4. Open `http://localhost`.

Never commit `.env`. Use unique production credentials; do not deploy the sample values from `.env.example`.

# Sistem Analisa Agunan Berbasis Data Pasar (Bali Land Market & BCE Calculator)

Aplikasi perbankan untuk Analis Kredit dalam mengestimasi nilai pasar agunan tanah menggunakan pendekatan data pasar (*Market Data Approach*) sesuai Standar Penilaian Indonesia (SPI) dan menghitung skor Bank Conservative Evaluation (BCE).

- **Frontend**: React 18, Vite, TailwindCSS, Leaflet Interactive Map, Lucide Icons.
- **Backend**: FastAPI, SQLAlchemy, Mangum ASGI Serverless Wrapper, Pydantic v2.
- **Data Pasar**: Brave Search API (mengambil referensi listing aktif tanah di area Bali dari Rumah123, Lamudi, dsb).
- **Database**: PostgreSQL (Supabase Free Tier) atau MySQL / SQLite untuk pengembangan lokal.
- **Hosting**: 100% Free Tier di Vercel (Frontend SPA + Backend Serverless Functions).

---

## 🚀 Panduan Menjalankan Secara Lokal

### Menggunakan Docker Compose
1. Salin `.env.example` ke `.env`:
   ```bash
   cp .env.example .env
   ```
2. Pastikan `BRAVE_SEARCH_API_KEY` terisi di `.env`.
3. Jalankan container:
   ```bash
   docker compose up --build -d
   ```
4. Buka di browser: `http://localhost`.

### Menjalankan Manual (Development)
- **Backend**:
  ```bash
  cd agunan-app/backend
  pip install -r requirements.txt
  uvicorn app.main:app --reload --port 8000
  ```
- **Frontend**:
  ```bash
  cd agunan-app/frontend
  bun install # atau npm install
  bun run dev # atau npm run dev
  ```

---

## ☁️ Arsitektur Hosting di Vercel

### 1. Backend Serverless (Vercel)
- Entry point serverless berada di `/api/index.py` dengan konfigurasi routing pada `/vercel.json`.
- Environment Variables utama pada Vercel Backend:
  - `DATABASE_URL`: URI koneksi PostgreSQL Supabase (misal: `postgresql://postgres:...@...supabase.co:5432/postgres`).
  - `SECRET_KEY`: String acak aman untuk token JWT.
  - `BRAVE_SEARCH_API_KEY`: Kunci API Brave Search untuk pencarian harga pasar internet.
  - `CORS_ORIGINS`: Domain frontend Vercel (misal: `https://agunan-app-1t8j.vercel.app`).

### 2. Frontend SPA (Vercel)
- Root directory: `agunan-app/frontend`.
- Environment Variable:
  - `VITE_API_BASE_URL`: URL backend Vercel publik (misal: `https://agunan-app-rhzi.vercel.app/api/v1`).

---

## 🔐 Akun Akses Default
- **Analis Kredit**:
  - Username: `analis1`
  - Password: `AnalisBank2026!`
- **Administrator**:
  - Username: `admin`
  - Password: `AdminBank2026!`
