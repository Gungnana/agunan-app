# Uji Coba Mandiri PaddleOCR Rekening Koran

Folder ini berisi perangkat pengujian **PaddleOCR** secara terpisah sebelum diintegrasikan penuh ke dalam API backend dan frontend:

## Berkas yang Tersedia
1. `test_rekening_ocr.py`: Script utama untuk menjalankan PaddleOCR pada file PDF (scan) atau Gambar (JPG/PNG), mengelompokkan baris tabel, dan mengekstrak mutasi rekening.
2. `generate_sample_statement.py`: Script pembuat dokumen sampel PDF rekening koran BCA untuk pengujian tanpa perlu dokumen nasabah asli.
3. `requirements-ocr.txt`: Daftar dependensi Python yang dibutuhkan untuk PaddleOCR & pemrosesan citra.

---

## Cara Menjalankan Uji Coba

### 1. Buat Virtual Environment & Install Dependensi
Dari terminal di direktori `agunan-app/backend`:

```bash
cd /Users/krishnaningrat/Sites/alatanalis/agunan-app/backend

# Buat virtual environment lokal (opsional tapi disarankan)
python3 -m venv .venv
source .venv/bin/activate

# Install dependensi
pip install -r scripts/requirements-ocr.txt
```

> **Catatan untuk macOS Apple Silicon (M1/M2/M3)**:
> Jika instalasi `paddlepaddle` memerlukan wheel spesifik, Anda bisa menggunakan perintah:
> ```bash
> pip install paddlepaddle paddleocr PyMuPDF opencv-python-headless
> ```

### 2. (Opsional) Buat Berkas PDF Rekening Sampel
Jika Anda ingin menguji menggunakan berkas simulasi rekening koran:
```bash
python scripts/generate_sample_statement.py scripts/sample_rekening_scan.pdf
```

### 3. Jalankan Pengujian OCR

**Menggunakan file sampel:**
```bash
python scripts/test_rekening_ocr.py scripts/sample_rekening_scan.pdf
```

**Menggunakan file scan / foto rekening Anda sendiri:**
```bash
python scripts/test_rekening_ocr.py /path/ke/file_rekening_anda.pdf
# atau file gambar:
python scripts/test_rekening_ocr.py /path/ke/foto_rekening.jpg
```

---

## Output Pengujian
1. **Log Konsol**: Menampilkan proses ekstraksi per halaman, koordinat kotak teks, klasifikasi bank, nama nasabah, no rekening, serta tabel preview mutasi transaksi.
2. **File JSON**: Hasil parsing terstruktur lengkap disimpan secara otomatis ke file `output_rekening_ocr.json`.
