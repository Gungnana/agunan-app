#!/usr/bin/env python3
"""
Script Uji Coba PaddleOCR untuk Rekap Rekening Koran
===================================================
Script ini digunakan untuk:
1. Mengubah berkas PDF (scan) atau Gambar (JPG/PNG) menjadi frame citra beresolusi tinggi.
2. Menjalankan model PaddleOCR untuk ekstraksi teks dan koordinat bounding box.
3. Melakukan rekonstruksi baris tabel mutasi (Tanggal, Keterangan, Debet, Kredit, Saldo).
4. Menghasilkan output terstruktur JSON dan tabel konsol.

Penggunaan:
    python test_rekening_ocr.py [path_ke_file_rekening.pdf atau .jpg]
    Jika path tidak diberikan, script akan mencari berkas 'sample_rekening_scan.pdf' atau membuat sampel uji coba.
"""

import os
import sys
import json
import re
from typing import List, Dict, Any, Optional

try:
    import cv2
    import numpy as np
    from paddleocr import PaddleOCR
except ImportError as e:
    print("\n" + "="*70)
    print("❌ DEPENDENSI BELUM TERINSTALL!")
    print(f"Error: {e}")
    print("\nSilakan install dependensi yang dibutuhkan terlebih dahulu dengan menjalankan:")
    print("  pip install paddlepaddle paddleocr PyMuPDF opencv-python-headless numpy")
    print("="*70 + "\n")
    sys.exit(1)

try:
    import fitz  # PyMuPDF
except ImportError:
    print("\n[PERINGATAN] PyMuPDF (fitz) belum terinstall. Untuk membaca file PDF, install: pip install PyMuPDF\n")
    fitz = None


def clean_currency(val_str: str) -> Optional[float]:
    """Membersihkan format mata uang rupiah/desimal menjadi angka float."""
    if not val_str:
        return None
    s = val_str.strip()
    s = re.sub(r'^(?:Rp\.?|IDR)\s*', '', s, flags=re.IGNORECASE).strip()
    
    # Deteksi format ribuan dan desimal
    if '.' in s and ',' in s:
        if s.rfind(',') > s.rfind('.'):
            # Format Indonesia: 1.250.000,00
            s = s.replace('.', '').replace(',', '.')
        else:
            # Format US: 1,250,000.00
            s = s.replace(',', '')
    elif ',' in s:
        if re.search(r',\d{2}$', s):
            s = s.replace(',', '.')
        else:
            s = s.replace(',', '')
    elif '.' in s:
        parts = s.split('.')
        if len(parts) > 2 or (len(parts) == 2 and len(parts[1]) == 3):
            s = s.replace('.', '')
            
    num_str = re.sub(r'[^0-9.-]', '', s)
    try:
        return float(num_str) if num_str else None
    except ValueError:
        return None


def convert_pdf_to_images(pdf_path: str, dpi: int = 200) -> List[np.ndarray]:
    """Mengonversi setiap halaman PDF menjadi gambar numpy BGR dengan PyMuPDF."""
    if fitz is None:
        raise RuntimeError("PyMuPDF belum terinstall. Install dengan: pip install PyMuPDF")
        
    doc = fitz.open(pdf_path)
    images = []
    print(f"📄 Membaca dokumen PDF: {pdf_path} ({len(doc)} halaman)...")
    
    for i, page in enumerate(doc):
        # Zoom matrix untuk menghasilkan resolusi sesuai DPI (72 dpi adalah basis 1.0)
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        
        # Konversi pixmap ke array numpy
        img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.h, pix.w, pix.n))
        if pix.n == 3:
            # RGB ke BGR untuk OpenCV
            img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        else:
            img_bgr = img_array
        images.append(img_bgr)
        print(f"   ✓ Halaman {i + 1} dikonversi ke gambar ({pix.w}x{pix.h} px)")
        
    return images


def load_input_file(file_path: str) -> List[np.ndarray]:
    """Memuat file PDF atau Gambar ke dalam daftar gambar numpy."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.pdf':
        return convert_pdf_to_images(file_path)
    elif ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp']:
        print(f"🖼️  Membaca berkas gambar: {file_path}...")
        img = cv2.imread(file_path)
        if img is None:
            raise FileNotFoundError(f"Tidak dapat membaca gambar di: {file_path}")
        return [img]
    else:
        raise ValueError(f"Ekstensi file '{ext}' tidak didukung. Harap gunakan PDF atau JPG/PNG.")


def extract_text_with_paddle(ocr: PaddleOCR, images: List[np.ndarray]) -> List[List[Dict[str, Any]]]:
    """
    Menjalankan PaddleOCR pada setiap halaman.
    Mengembalikan daftar item per halaman:
    [
        [
            {'box': [[x1, y1], [x2, y2], [x3, y3], [x4, y4]], 'text': '...', 'conf': 0.98, 'y_mid': ..., 'x_min': ...},
            ...
        ],
        ...
    ]
    """
    pages_data = []
    
    for page_idx, img in enumerate(images):
        print(f"\n🔍 [PaddleOCR] Menganalisis halaman {page_idx + 1}...")
        
        page_items = []
        # Coba metode predict (PaddleOCR v3) terlebih dahulu
        try:
            preds = ocr.predict(img)
            for res in preds:
                texts = res.get('rec_texts', [])
                scores = res.get('rec_scores', [])
                boxes = res.get('rec_boxes', [])
                for i in range(len(texts)):
                    box = boxes[i]  # [x_min, y_min, x_max, y_max]
                    x_min, y_min, x_max, y_max = float(box[0]), float(box[1]), float(box[2]), float(box[3])
                    text = texts[i]
                    conf = float(scores[i])
                    page_items.append({
                        'box': [[x_min, y_min], [x_max, y_min], [x_max, y_max], [x_min, y_max]],
                        'text': text.strip(),
                        'conf': round(conf, 3),
                        'y_mid': (y_min + y_max) / 2.0,
                        'x_min': x_min,
                        'height': y_max - y_min
                    })
        except Exception:
            # Fallback ke metode ocr legacy
            result = ocr.ocr(img)
            if result and len(result) > 0 and result[0] is not None:
                for item in result[0]:
                    box = item[0]
                    text, conf = item[1]
                    y_coords = [pt[1] for pt in box]
                    x_coords = [pt[0] for pt in box]
                    page_items.append({
                        'box': box,
                        'text': text.strip(),
                        'conf': round(float(conf), 3),
                        'y_mid': sum(y_coords) / len(y_coords),
                        'x_min': min(x_coords),
                        'height': max(y_coords) - min(y_coords)
                    })
        
        print(f"   ✓ Terdeteksi {len(page_items)} blok teks pada halaman {page_idx + 1}")
        pages_data.append(page_items)
        
    return pages_data


def cluster_into_lines(items: List[Dict[str, Any]], y_tolerance: float = 10.0) -> List[List[Dict[str, Any]]]:
    """Mengelompokkan blok-blok teks yang berada di baris horizontal yang sama."""
    # Urutkan berdasarkan koordinat Y
    sorted_items = sorted(items, key=lambda x: x['y_mid'])
    lines: List[List[Dict[str, Any]]] = []
    
    for it in sorted_items:
        # Coba masukkan ke baris yang sudah ada jika selisih Y dalam batas toleransi
        matched_line = None
        for line in lines:
            avg_y = sum(x['y_mid'] for x in line) / len(line)
            if abs(it['y_mid'] - avg_y) <= y_tolerance:
                matched_line = line
                break
        
        if matched_line is not None:
            matched_line.append(it)
        else:
            lines.append([it])
            
    # Urutkan elemen di dalam tiap baris dari kiri ke kanan (berdasarkan x_min)
    for line in lines:
        line.sort(key=lambda x: x['x_min'])
        
    # Urutkan semua baris dari atas ke bawah
    lines.sort(key=lambda l: sum(x['y_mid'] for x in l) / len(l))
    return lines


def parse_bank_statement_lines(lines: List[List[Dict[str, Any]]]) -> Dict[str, Any]:
    """
    Parser heuristik untuk mengidentifikasi:
    - Informasi Header (Nama Rekening, No Rekening, Bank)
    - Baris Transaksi (Tanggal, Keterangan, Debet, Kredit, Saldo)
    """
    nama_debitur = ""
    no_rekening = ""
    bank_name = "BANK UMUM"
    transactions = []
    
    # Pola tanggal rekening koran: "2026-09-30", "01/05", "01/05/24", "01 MAY", "01/05/2024"
    date_pattern = re.compile(r'^\b(?:(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})|(\d{1,2})[/\-\s]([A-Za-z]{3}|\d{1,2})(?:[/\-\s](\d{2,4}))?)\b')
    
    for line in lines:
        full_line_text = " ".join([it['text'] for it in line])
        upper = full_line_text.upper()
        
        # 1. Deteksi Bank
        if "BCA" in upper or "CENTRAL ASIA" in upper:
            bank_name = "BCA"
        elif "BRI" in upper or "RAKYAT INDONESIA" in upper:
            bank_name = "BRI"
        elif "MANDIRI" in upper:
            bank_name = "MANDIRI"
        elif "BNI" in upper or "TAPLUS" in upper:
            bank_name = "BNI"
            
        # 2. Deteksi No Rekening
        if not no_rekening:
            rek_match = re.search(r'(?:NO\.?\s*REK(?:ENING)?|ACCOUNT\s*NO|REKENING)[\s\:\.\r\n]+([0-9\-\s]{8,20})', upper)
            if rek_match:
                no_rekening = re.sub(r'[^0-9]', '', rek_match.group(1))
                
        # 3. Deteksi Nama Debitur
        if not nama_debitur:
            if "PRODUK" in upper or "TAPLUS" in upper:
                parts = re.split(r'PRODUK|TAPLUS', full_line_text, flags=re.IGNORECASE)[0].strip()
                if len(parts) >= 3 and not any(k in parts.upper() for k in ["TANGGAL", "REKENING", "HALAMAN", "KEPADA"]):
                    nama_debitur = parts
            else:
                nama_match = re.search(r'(?:NAMA|NAME|KEPADA\s*YTH)[\s\:\.\r\n]+(?:TANGGAL[^\n\r]*[\r\n]+)?([A-Z\s\.,]{3,40})', upper)
                if nama_match:
                    cand = re.split(r'PRODUK|TAPLUS|PERIODE', nama_match.group(1), flags=re.IGNORECASE)[0].strip()
                    if len(cand) > 3 and not any(k in cand for k in ["TANGGAL", "REKENING", "HALAMAN", "PERIODE"]):
                        nama_debitur = cand
                
        # 4. Deteksi Baris Mutasi Transaksi
        first_item = line[0]
        date_match = date_pattern.search(first_item['text'])
        
        if date_match and len(line) >= 3:
            raw_date = date_match.group(0)
            
            # Cek apakah ada indikasi nominal (angka di kolom kanan)
            amounts = []
            desc_parts = []
            
            for item in line[1:]:
                txt = item['text']
                curr = clean_currency(txt)
                # Jika item berupa nominal uang yang valid (> 100 rupiah biasanya)
                if curr is not None and (re.search(r'\d+[.,]\d+', txt) or len(re.sub(r'\D', '', txt)) >= 4):
                    amounts.append((curr, txt, item['x_min']))
                else:
                    desc_parts.append(txt)
                    
            if amounts:
                description = " ".join(desc_parts)
                # Heuristik Debet / Kredit / Saldo
                is_db = False
                if " DB" in upper or " D " in upper or "DR" in upper:
                    is_db = True
                elif " CR" in upper or " C " in upper:
                    is_db = False
                elif len(amounts) >= 2:
                    # Jika ada 2 nominal, biasanya [Mutasi, Saldo]
                    pass
                
                transactions.append({
                    'tanggal': raw_date,
                    'keterangan': description or '-',
                    'raw_line': full_line_text,
                    'amounts_detected': [a[0] for a in amounts]
                })

    return {
        'bank': bank_name,
        'nama_debitur': nama_debitur or "Tidak Terdeteksi Otomatis",
        'no_rekening': no_rekening or "Tidak Terdeteksi Otomatis",
        'total_transaksi_ditemukan': len(transactions),
        'transaksi': transactions
    }


def main():
    print("="*75)
    print(" 🚀 PADDLE OCR TEST RUNNER - REKAP REKENING KORAN")
    print("="*75)
    
    # Tentukan berkas input
    input_file = None
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    else:
        # Cek apakah ada file sampel di folder script
        default_samples = [
            "sample_rekening_scan.pdf",
            "sample_rekening.pdf",
            "sample_rekening.jpg",
            "sample_rekening.png"
        ]
        for s in default_samples:
            if os.path.exists(s):
                input_file = s
                break
                
    if not input_file or not os.path.exists(input_file):
        print("\nℹ️  Belum ada file rekening yang diberikan.")
        print("Penggunaan:")
        print(f"  python {os.path.basename(__file__)} <path_ke_file_pdf_atau_gambar>")
        print("\nContoh:")
        print(f"  python {os.path.basename(__file__)} /Users/.../rekening_bca_scan.pdf")
        print("  python {os.path.basename(__file__)} /Users/.../foto_rekening.jpg")
        return

    print(f"\n📂 Menguji file: {input_file}")
    
    # 1. Konversi ke gambar
    images = load_input_file(input_file)
    print(f"✓ Berhasil memuat {len(images)} halaman/gambar.")
    
    # 2. Inisialisasi PaddleOCR
    print("\n⚙️  Menginisialisasi PaddleOCR (Language: 'en')...")
    try:
        ocr = PaddleOCR(use_textline_orientation=True, lang='en')
    except TypeError:
        ocr = PaddleOCR(use_angle_cls=True, lang='en')
    
    # 3. Ekstraksi teks & koordinat
    pages_items = extract_text_with_paddle(ocr, images)
    
    # 4. Rekonstruksi baris per halaman
    all_parsed_results = []
    for p_idx, page_items in enumerate(pages_items):
        print(f"\n📐 [Halaman {p_idx + 1}] Mengelompokkan koordinat teks ke dalam baris tabel...")
        lines = cluster_into_lines(page_items, y_tolerance=8.0)
        print(f"   ✓ Rekonstruksi baris: {len(lines)} baris terdeteksi.")
        
        parsed = parse_bank_statement_lines(lines)
        all_parsed_results.append({
            'halaman': p_idx + 1,
            'summary': parsed,
            'lines_raw': [" ".join([it['text'] for it in l]) for l in lines]
        })

    # 5. Tampilkan Hasil ke Konsol
    print("\n" + "="*75)
    print(" 📊 HASIL ANALISIS REKENING KORAN")
    print("="*75)
    
    first_summary = all_parsed_results[0]['summary']
    print(f"Bank Terdeteksi        : {first_summary['bank']}")
    print(f"Nama Debitur / Pemilik : {first_summary['nama_debitur']}")
    print(f"Nomor Rekening         : {first_summary['no_rekening']}")
    
    total_tx = sum(p['summary']['total_transaksi_ditemukan'] for p in all_parsed_results)
    print(f"Total Mutasi Terbaca   : {total_tx} baris")
    print("-"*75)
    
    # Tampilkan preview transaksi
    for p in all_parsed_results:
        print(f"\n--- Preview Mutasi Transaksi (Halaman {p['halaman']}) ---")
        txs = p['summary']['transaksi']
        if not txs:
            print("  (Tidak ada baris mutasi terdeteksi dengan pola tanggal)")
        else:
            for idx, tx in enumerate(txs[:15], 1):
                amounts_str = ", ".join([f"Rp {a:,.0f}" for a in tx['amounts_detected']])
                print(f" {idx:2d}. [{tx['tanggal']}] {tx['keterangan'][:35]:<35} | {amounts_str}")
            if len(txs) > 15:
                print(f" ... dan {len(txs) - 15} transaksi lainnya.")

    # Simpan output lengkap ke file JSON
    output_json_path = "output_rekening_ocr.json"
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(all_parsed_results, f, indent=2, ensure_ascii=False)
        
    print("\n" + "="*75)
    print(f"✅ Selesai! Hasil lengkap JSON disimpan di: {os.path.abspath(output_json_path)}")
    print("="*75 + "\n")


if __name__ == "__main__":
    main()
