import re
import os
import io
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

try:
    import cv2
except ImportError:
    cv2 = None

try:
    import numpy as np
except ImportError:
    np = None

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

logger = logging.getLogger(__name__)

# PaddleOCR singleton instance
_ocr_instance = None

MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

MONTH_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

MONTH_WORD_MAP = {
    'jan': 1, 'januari': 1, 'january': 1,
    'feb': 2, 'februari': 2, 'february': 2, 'peb': 2, 'pebruari': 2,
    'mar': 3, 'maret': 3, 'march': 3, 'mrt': 3,
    'apr': 4, 'april': 4,
    'mei': 5, 'may': 5,
    'jun': 6, 'juni': 6, 'june': 6,
    'jul': 7, 'juli': 7, 'july': 7,
    'agu': 8, 'agustus': 8, 'aug': 8, 'august': 8, 'agt': 8,
    'sep': 9, 'september': 9,
    'okt': 10, 'oktober': 10, 'oct': 10, 'october': 10,
    'nov': 11, 'november': 11, 'nop': 11, 'nopember': 11,
    'des': 12, 'desember': 12, 'dec': 12, 'december': 12,
}


def get_ocr_instance():
    """Mengambil atau menginisialisasi singleton instance PaddleOCR."""
    global _ocr_instance
    if _ocr_instance is None:
        try:
            from paddleocr import PaddleOCR
            logger.info("Menginisialisasi PaddleOCR model...")
            try:
                _ocr_instance = PaddleOCR(use_textline_orientation=True, lang='en')
            except TypeError:
                _ocr_instance = PaddleOCR(use_angle_cls=True, lang='en')
            logger.info("PaddleOCR model berhasil diinisialisasi.")
        except Exception as e:
            logger.error(f"Gagal memuat PaddleOCR: {e}")
            raise RuntimeError(f"Gagal menginisialisasi modul PaddleOCR: {str(e)}")
    return _ocr_instance


def clean_currency(val_str: str) -> Optional[float]:
    """Membersihkan format mata uang rupiah/desimal menjadi angka float."""
    if not val_str:
        return None
    s = val_str.strip()
    s = re.sub(r'^(?:Rp\.?|IDR)\s*', '', s, flags=re.IGNORECASE).strip()

    # Jangan parse jika murni 4-digit tanpa titik/koma (seringkali cabang seperti 0145)
    if re.match(r'^0\d{3}$', s):
        return None

    # Deteksi ribuan dan desimal
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


def convert_pdf_bytes_to_images(file_bytes: bytes, password: Optional[str] = None, dpi: int = 180, max_pages: int = 12) -> List[np.ndarray]:
    """Mengonversi berkas PDF bytes menjadi daftar citra numpy BGR."""
    if fitz is None:
        raise RuntimeError("Library PyMuPDF (fitz) belum terinstall di server.")

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    if doc.is_encrypted:
        if not password:
            raise ValueError("PDF_PASSWORD_REQUIRED")
        if not doc.authenticate(password):
            raise ValueError("PDF_PASSWORD_INCORRECT")

    images = []
    total_pages = min(len(doc), max_pages)
    for i in range(total_pages):
        page = doc[i]
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)

        img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.h, pix.w, pix.n))
        if pix.n == 3:
            img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        else:
            img_bgr = img_array
        images.append(img_bgr)

    return images


def load_file_images(file_bytes: bytes, filename: str, password: Optional[str] = None) -> List[np.ndarray]:
    """Memuat citra dari PDF atau file Gambar."""
    ext = os.path.splitext(filename)[1].lower()
    if ext == '.pdf':
        return convert_pdf_bytes_to_images(file_bytes, password=password)
    elif ext in ['.jpg', '.jpeg', '.png', '.bmp', '.webp', '.tiff']:
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Gagal membaca format citra yang diunggah.")
        return [img]
    else:
        # Coba buka sebagai PDF jika tidak ada ekstensi
        try:
            return convert_pdf_bytes_to_images(file_bytes, password=password)
        except Exception:
            raise ValueError(f"Tipe berkas '{ext}' tidak didukung. Harap unggah PDF atau Gambar (JPG/PNG).")


def cluster_into_lines(items: List[Dict[str, Any]], y_tolerance: float = 8.0) -> List[List[Dict[str, Any]]]:
    """Mengelompokkan teks OCR berdasarkan koordinat Y baris horizontal."""
    sorted_items = sorted(items, key=lambda x: x['y_mid'])
    lines: List[List[Dict[str, Any]]] = []

    for it in sorted_items:
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

    for line in lines:
        line.sort(key=lambda x: x['x_min'])

    lines.sort(key=lambda l: sum(x['y_mid'] for x in l) / len(l))
    return lines


def run_paddle_on_images(images: List[np.ndarray]) -> List[List[Dict[str, Any]]]:
    """Menjalankan inferensi PaddleOCR pada tiap citra halaman."""
    ocr = get_ocr_instance()
    all_pages = []

    for img in images:
        page_items = []
        try:
            preds = ocr.predict(img)
            for res in preds:
                texts = res.get('rec_texts', [])
                scores = res.get('rec_scores', [])
                boxes = res.get('rec_boxes', [])
                for i in range(len(texts)):
                    box = boxes[i]
                    x_min, y_min, x_max, y_max = float(box[0]), float(box[1]), float(box[2]), float(box[3])
                    text = texts[i].strip()
                    if text:
                        page_items.append({
                            'text': text,
                            'conf': float(scores[i]),
                            'y_mid': (y_min + y_max) / 2.0,
                            'x_min': x_min,
                            'x_max': x_max,
                            'y_min': y_min,
                            'y_max': y_max,
                        })
        except Exception:
            # Fallback legacy OCR method
            result = ocr.ocr(img)
            if result and len(result) > 0 and result[0] is not None:
                for item in result[0]:
                    box = item[0]
                    text, conf = item[1]
                    y_coords = [pt[1] for pt in box]
                    x_coords = [pt[0] for pt in box]
                    text_str = text.strip()
                    if text_str:
                        page_items.append({
                            'text': text_str,
                            'conf': float(conf),
                            'y_mid': sum(y_coords) / len(y_coords),
                            'x_min': min(x_coords),
                            'x_max': max(x_coords),
                            'y_min': min(y_coords),
                            'y_max': max(y_coords),
                        })

        all_pages.append(page_items)

    return all_pages


def parse_statement_from_ocr(all_pages_items: List[List[Dict[str, Any]]]) -> Dict[str, Any]:
    """
    Menganalisis baris teks OCR dan mengonstruksi transaksi rekening:
    - Nama Bank, No Rekening, Nama Debitur
    - Transaksi terperinci per bulan
    """
    bank_name = "BANK UMUM"
    no_rekening = ""
    nama_debitur = ""
    detected_year = datetime.now().year

    date_re = re.compile(
        r'^\b(?:(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})|(\d{1,2})[/\-\s]([A-Za-z]{3}|\d{1,2})(?:[/\-\s](\d{2,4}))?)\b'
    )

    all_raw_transactions: List[Dict[str, Any]] = []

    for page_items in all_pages_items:
        lines = cluster_into_lines(page_items, y_tolerance=8.0)

        for line in lines:
            full_line_text = " ".join([it['text'] for it in line])
            upper = full_line_text.upper()

            # 1. Deteksi Bank
            if "BCA" in upper or "CENTRAL ASIA" in upper:
                bank_name = "BCA"
            elif "MANDIRI" in upper:
                bank_name = "MANDIRI"
            elif "BRI" in upper or "RAKYAT INDONESIA" in upper:
                bank_name = "BRI"
            elif "BNI" in upper:
                bank_name = "BNI"
            elif "BPR" in upper or "KERTIAWAN" in upper:
                bank_name = "BPR KERTIAWAN"
            elif "DANAMON" in upper:
                bank_name = "DANAMON"
            elif "CIMB" in upper:
                bank_name = "CIMB NIAGA"
            elif "BPD" in upper or "BALI" in upper:
                bank_name = "BPD BALI"

            # 2. Deteksi No Rekening
            if not no_rekening:
                rek_match = re.search(r'(?:NO\.?\s*REK(?:ENING)?|ACCOUNT\s*(?:NO|NUMBER)|REKENING)[\s\:\.\r\n]+([0-9\-\s]{8,20})', upper)
                if rek_match:
                    clean_rek = re.sub(r'[^0-9]', '', rek_match.group(1))
                    if len(clean_rek) >= 8:
                        no_rekening = clean_rek

            # 3. Deteksi Nama Debitur
            if not nama_debitur:
                nama_match = re.search(r'(?:NAMA|NAME|KEPADA\s*YTH|PEMILIK)[\s\:\.\r\n]+(?:TANGGAL[^\n\r]*[\r\n]+)?([A-Z\s\.,]{3,40})', upper)
                if nama_match:
                    cand = re.split(r'PRODUK|TAPLUS|PERIODE|HALAMAN|NO\.?|ALAMAT', nama_match.group(1), flags=re.IGNORECASE)[0].strip()
                    if len(cand) >= 3 and not any(k in cand.upper() for k in ["TANGGAL", "REKENING", "HALAMAN", "PERIODE", "RUPIAH"]):
                        nama_debitur = cand

            # 4. Deteksi Tahun dari header dokumen jika ada (contoh: "PERIODE : MEI 2026" atau "2026")
            year_match = re.search(r'\b(202[0-9])\b', upper)
            if year_match:
                detected_year = int(year_match.group(1))

            # 5. Deteksi Baris Mutasi
            first_item = line[0]
            date_match = date_re.search(first_item['text'])

            if date_match and len(line) >= 2:
                # Ekstrak tanggal
                raw_date = date_match.group(0)
                day = 1
                month = 1
                year = detected_year

                # Parsing format tanggal
                if '-' in raw_date or '/' in raw_date or ' ' in raw_date:
                    parts = re.split(r'[/\-\s]', raw_date)
                    if len(parts) >= 2:
                        p1, p2 = parts[0], parts[1]
                        if len(p1) == 4:
                            year = int(p1)
                            month = int(p2)
                            day = int(parts[2]) if len(parts) > 2 else 1
                        else:
                            day = int(re.sub(r'\D', '', p1) or 1)
                            if p2.lower() in MONTH_WORD_MAP:
                                month = MONTH_WORD_MAP[p2.lower()]
                            else:
                                month = int(re.sub(r'\D', '', p2) or 1)
                            if len(parts) >= 3 and len(parts[2]) >= 2:
                                y_str = re.sub(r'\D', '', parts[2])
                                if len(y_str) == 2:
                                    year = 2000 + int(y_str)
                                elif len(y_str) == 4:
                                    year = int(y_str)

                # Ekstrak token nominal dan keterangan
                amounts: List[Tuple[float, str, float]] = []  # (value, raw_str, x_min)
                desc_tokens: List[str] = []

                is_db = False
                is_cr = False
                if re.search(r'\b(?:DB|D|DEBET|DR)\b', upper):
                    is_db = True
                elif re.search(r'\b(?:CR|C|KREDIT)\b', upper):
                    is_cr = True

                for item in line[1:]:
                    txt = item['text']
                    val = clean_currency(txt)
                    # Hanya terima angka yang valid sebagai nominal (ada desimal/pemisah atau >= 4 digit)
                    if val is not None and (re.search(r'[.,]\d{2}', txt) or len(re.sub(r'\D', '', txt)) >= 4):
                        # Abaikan jika ini murni nomor rekening tujuan 10 digit tanpa titik
                        if len(re.sub(r'\D', '', txt)) >= 10 and '.' not in txt and ',' not in txt:
                            desc_tokens.append(txt)
                        else:
                            amounts.append((val, txt, item['x_min']))
                    else:
                        desc_tokens.append(txt)

                if amounts:
                    mutation_val = 0.0
                    saldo_val = 0.0

                    if len(amounts) >= 2:
                        # Nominal pertama adalah mutasi, nominal terakhir adalah saldo
                        mutation_val = amounts[0][0]
                        saldo_val = amounts[-1][0]
                    else:
                        mutation_val = amounts[0][0]
                        saldo_val = 0.0

                    # Tentukan apakah Debet atau Kredit
                    debet_val = mutation_val if is_db else None
                    kredit_val = mutation_val if (is_cr or not is_db) else None

                    date_str = f"{str(day).zfill(2)}-{MONTH_SHORT[min(max(month - 1, 0), 11)]}-{str(year)[-2:]}"

                    all_raw_transactions.append({
                        'day': day,
                        'month': month,
                        'year': year,
                        'dateStr': date_str,
                        'desc': " ".join(desc_tokens) or "TRANSAKSI",
                        'debet': debet_val,
                        'kredit': kredit_val,
                        'saldo': saldo_val,
                    })

    # Susun transaksi per bulan
    months_dict: Dict[Tuple[int, int], List[Dict[str, Any]]] = {}
    for tx in all_raw_transactions:
        key = (tx['year'], tx['month'])
        if key not in months_dict:
            months_dict[key] = []
        months_dict[key].append(tx)

    sorted_keys = sorted(months_dict.keys())

    # Jika dokumen hanya memuat 1 atau 2 bulan, pad sehingga pas 3 bulan untuk UI
    if not sorted_keys:
        curr_y = detected_year
        curr_m = datetime.now().month
        sorted_keys = [
            (curr_y if curr_m > 2 else curr_y - 1, (curr_m - 3) % 12 + 1),
            (curr_y if curr_m > 1 else curr_y - 1, (curr_m - 2) % 12 + 1),
            (curr_y, curr_m)
        ]
    elif len(sorted_keys) == 1:
        y, m = sorted_keys[0]
        prev_m1 = (m - 2) if m > 2 else (12 + m - 2)
        prev_y1 = y if m > 2 else (y - 1)
        prev_m2 = (m - 1) if m > 1 else (12 + m - 1)
        prev_y2 = y if m > 1 else (y - 1)
        sorted_keys = [(prev_y1, prev_m1), (prev_y2, prev_m2), (y, m)]
    elif len(sorted_keys) == 2:
        y, m = sorted_keys[0]
        prev_m = (m - 1) if m > 1 else 12
        prev_y = y if m > 1 else (y - 1)
        sorted_keys = [(prev_y, prev_m)] + sorted_keys

    # Ambil maksimal 3 bulan terakhir
    chosen_keys = sorted_keys[-3:]

    formatted_months = []
    for idx, key in enumerate(chosen_keys):
        y, m = key
        month_name = f"{MONTH_NAMES[m - 1]} {y}"
        tx_list = months_dict.get(key, [])

        # Rekonstruksi Saldo Awal
        saldo_awal = 0.0
        if tx_list:
            first_tx = tx_list[0]
            first_saldo = first_tx.get('saldo', 0.0)
            if first_saldo > 0:
                # saldo_awal = saldo_akhir - kredit + debet
                c_val = first_tx.get('kredit') or 0.0
                d_val = first_tx.get('debet') or 0.0
                saldo_awal = max(0.0, first_saldo - c_val + d_val)

        records = []
        for r_idx, tx in enumerate(tx_list):
            records.append({
                'no': r_idx + 1,
                'dateStr': tx['dateStr'],
                'day': tx['day'],
                'month': tx['month'],
                'year': tx['year'],
                'debet': tx['debet'],
                'kredit': tx['kredit'],
                'saldo': tx['saldo'],
            })

        formatted_months.append({
            'monthIndex': idx + 1,
            'monthName': month_name,
            'year': y,
            'monthNumber': m,
            'saldoAwal': saldo_awal,
            'records': records,
        })

    return {
        'namaDebitur': nama_debitur or "NASABAH DEBITUR",
        'tabBank': bank_name,
        'noRek': no_rekening or "0000000000",
        'months': formatted_months,
    }


def process_bank_statement_ocr(file_bytes: bytes, filename: str, password: Optional[str] = None) -> Dict[str, Any]:
    """Fungsi utama untuk memproses berkas rekening koran dengan PaddleOCR."""
    if cv2 is None or np is None:
        raise RuntimeError(
            "Modul OpenCV/PaddleOCR tidak tersedia di runtime server ini (misal Vercel Serverless 250MB limit). "
            "Untuk menjalankan model deep-learning PaddleOCR, diperlukan server Python/Docker mandiri. "
            "Silakan gunakan Mode Instan (PDF Asli) untuk e-statement digital."
        )
    images = load_file_images(file_bytes, filename, password=password)
    all_pages_items = run_paddle_on_images(images)
    parsed_data = parse_statement_from_ocr(all_pages_items)
    return parsed_data
